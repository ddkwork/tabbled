import {CustomDataSource, DataSourceInterface, EntityInterface} from "./datasource";
import {FieldConfigInterface, FieldInterface, generateEntityWithDefault} from "./field";
import _ from 'lodash'
import {useDataSourceService} from "../services/datasource.service";
import { FlakeId } from '../flake-id'
import {EventEmitter} from "events";
let flakeId = new FlakeId()

let dsService = useDataSourceService()

export interface DataSetConfigInterface {
    alias: string,
    dataSource: string,
    autoCommit: boolean,
    autoOpen: boolean
}

interface RowChange {
    old: any,
    new: any,
    type: 'insert' | 'update' | 'remove',
    at: Date
}

export function useDataSet(config: DataSetConfigInterface): DataSet {
    let ds = dsService.getDataSourceByAlias(config.dataSource);

    if (!ds)
        return undefined;

    return new DataSet(config, ds)
}

export class DataSet extends  EventEmitter {

    constructor(config: DataSetConfigInterface, dataSource: DataSourceInterface) {
        super()
        this.dataSource = dataSource;
        this.alias = config.alias;
        this.autoOpen = config.autoOpen;
        this.autoCommit = config.autoCommit;
        this.keyField = this.dataSource.keyField

        //console.log('DataSet created', config)

        // this.dataSource.on('updated', async (value) => {
        //     // @ts-ignore
        //     // I don't know, but we access the ref<> in emit callback then ref need to get with .value
        //     let data = this.data().value
        //     console.log(value)
        //     for(let i in data) {
        //         console.log(value.id, 'updated')
        //         let item = data[i]
        //         if (item.id === value.id) {
        //             data[i] = value
        //
        //         }
        //     }
        // })
        //
        // this.dataSource.on('inserted', async () => {
        //     // @ts-ignore
        //     this._data = await this.dataSource.getAll();
        //     this._changesById.clear();
        //     console.log("inserted")
        // })
        //
        // this.dataSource.on('removed', async () => {
        //     // @ts-ignore
        //     this._data = await this.dataSource.getAll();
        //     this._changesById.clear();
        //     console.log("removed")
        // })
    }

    readonly alias: string;
    readonly dataSource: DataSourceInterface;
    readonly keyField: string;
    autoCommit: boolean = true;
    autoOpen: boolean = true;
    private _data = new Array<EntityInterface>()
    private _isOpen = false

    get isOpen() {
        return this._isOpen;
    }

    private _changesById: Map<string, RowChange> = new Map<string, RowChange>()

    isChanged():boolean {
        return this._changesById.size > 0
    }

    get data(): Array<EntityInterface> {
        return this._data
    }

    set data(data: Array<EntityInterface>) {
        this._data = data;
        this.dataSource.setData(data).then()
    }

    async open() {
        this.close()
        try {
            await this.load()
            this._isOpen = true;
            this.emit('open')
        } catch (e) {
            throw e
        }
        console.log("dataset opened ", this.isOpen)
    }

    async openOne(id?: string) {
        this.close()

        let _id = id;

        let one = undefined
        try {
            if (id) {
                one = await this.dataSource.getById(id)
            } else {
                _id = (await flakeId.generateId()).toString()
                one = generateEntityWithDefault(this.dataSource.fields)
                one.id = _id
                this._changesById.set(_id, {
                    new: one,
                    old: undefined,
                    at: new Date(),
                    type: 'insert'
                })
            }

        } catch (e) {
            console.log("Error while open data set ", this.alias, 'with id ', id)
            throw e
        }

        if (one) {
            this.data.push(one)
            this._currentId = _id;
            this._isOpen = true;

        }
        console.log("dataset opened one ", this.alias)
        this.emit('open')
    }

    close() {
        this._data = []
        this._changesById.clear();
        this._isOpen = false;
        this._currentId = null;
        this.emit('close')
    }

    selectedIds: string[] = []
    private _currentId: string | null = null

    get currentId(): string | null {
        return this._currentId;
    }

    set currentId(val) {
        this._currentId = val
    }

    get current() : EntityInterface {
        if (this._isOpen) {
            let row = this.getRowById(this.currentId)
            return this._data[row]
        }
        return undefined;
    }

    async setCurrentId(id: string | null) {
        if (this.autoCommit &&
            this.isChanged() &&
            this._currentId !== null &&
            this._currentId !== id) {
            await this.commit()
        }
        this._currentId = id
    }

    async load() {
        this._data = await this.dataSource.getAll();
        this._changesById.clear();
    }


    getByRow(row: number) : EntityInterface {
        return this.data[row]
    }

    getColumnByAlias(alias: string): FieldInterface | undefined {
        return this.dataSource.getFieldByAlias(alias);
    }

    async insertRow(row?: number): Promise<string> {
        console.log(this)
        if (!this.isOpen) {
            throw new Error(`DataSet ${this.alias} is not open`)
        }

        let r:number | undefined;
        if (!row && this._currentId) {
            r = this.getRowById(this._currentId)
            if (!r) r = 0
        } else
            r = row;

        let id = (await flakeId.generateId()).toString()

        let item = generateEntityWithDefault(this.dataSource.fields)
        item.id = id.toString()


        this._data.splice(r ? r : 0, 0, item);

        this._changesById.set(id, {
            new: item,
            old: undefined,
            at: new Date(),
            type: 'insert'
        })

        this.emit('update')
        return this.currentId
    }

    update(field: string, data: any):boolean {
        if (!this.isOpen  || !this._currentId) {
            throw new Error(`DataSet ${this.alias} is not open`)
        }

        let row = this.getRowById(this._currentId)

        let res = this.updateDataRow(row, field, data);

        if (res)
            this.emit('update')

        return res
    }

    updateDataRow(row: number, field: string, cellData: any): boolean {

        let ent = this._data[row]
        if (!ent)
            return false;

        let oldEnt = _.cloneDeep(ent)
        let change = this._changesById.get(ent.id);

         ent[field] = cellData

        //console.log(change)

        if (change) {
            change.new = _.cloneDeep(ent)
            change.at = new Date()
        } else {
            change = {
                new: _.cloneDeep(ent),
                old: oldEnt,
                type: 'update',
                at: new Date()
            }
        }

        //this._data.splice(row, 1, ent)
        this._data[row][field] = cellData
        this._changesById.set(ent.id, change)

        //If datasourse is CustomDataSource than the source should take a value without committing
        if (this.dataSource instanceof CustomDataSource) {
            this.dataSource.setValue(ent.id, field, cellData)
        }

        this.emit('update')
        return true;
    }

    removeRow(row: number) : boolean {
        if (!this.isOpen) {
            throw new Error(`DataSet ${this.alias} is not open`)
        }
        let id = this._data[row].id;
        let change = this._changesById.get(id);

        if (change) {
            if (change.type === 'insert') {
                this._changesById.delete(id)
            } else {
                change.new = null;
                change.at = new Date()
            }
        } else {
            change = {
                new: null,
                old: _.cloneDeep(this._data[row]),
                type: "remove",
                at: new Date()
            }
        }

        this._changesById.set(id, change)

        this._data.splice(row, 1)

        this.emit('remove')
        this.emit('dataUpdate')

        return true
    }

    removeByCurrentId() : boolean {
        if (!this.isOpen) {
            throw new Error(`DataSet ${this.alias} is not open`)
        }
        if (!this._currentId)
            return false;

        let row = this.getRowById(this._currentId)

        if (!row)
            return false;

        this._data.splice(row, 1)
        return true
    }

    removeBySelectedId() : boolean {
        if (!this.isOpen) {
            throw new Error(`DataSet ${this.alias} is not open`)
        }

        if (!this.selectedIds.length)
            return false;

        this.selectedIds.forEach((id) => {
            let row = this.getRowById(id)
            if (row !== undefined) {
                this.removeRow(row)
            }
        })
        this.emit('update')
        return true
    }

    async commit() {
        if (!this.isOpen) {
            throw new Error(`DataSet ${this.alias} is not open`)
        }
        if (!this._changesById.size)
            return;



        console.log('Commit changes')
        let changes = [...this._changesById.values()]

        this._changesById.clear()
        for (let i in changes) {
            let item:any = changes[i]
            switch (item.type) {
                case "insert": await this.dataSource.insert(item.new.id, item.new); break;
                case "update": await this.dataSource.updateById(item.new.id, item.new); break;
                case "remove": await this.dataSource.removeById(item.old.id); break;
                default: console.warn("Unknown type of operation in DataSet Commit")
            }
        }
    }

    rollback() {
        if (!this.isOpen  || !this._currentId) {
            throw new Error(`DataSet ${this.alias} is not open`)
        }
    }

    private getRowById(id: string): number | undefined {
        for (let i in this._data) {
            if (this._data[i].id === id) {
                return Number(i)
            }
        }
        return undefined
    }
}

export const dataSetProperties:FieldConfigInterface[] = [
    {
        title: 'Alias',
        alias: 'alias',
        type: "string",
        required: true
    },
    {
        title: 'DataSource',
        alias: 'dataSource',
        type: 'datasource',
        required: true
    },
    {
        title: 'Auto open',
        alias: 'autoOpen',
        type: 'bool',
        required: false,
        default: true
    },
    {
        title: 'Auto commit changes',
        alias: 'autoCommit',
        type: 'bool',
        required: false,
        default: true
    },
]