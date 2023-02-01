<template>
    <div class="panel">
        <div style="padding: 16px 16px 0 16px">


            <div class="title">Settings</div>
            <div class="path">
    <!--            {{visiblePath}}-->
                <div class="path" v-for="(item,idx)  in _currentPathArray">
                    <div v-if="idx > 0" class="path-separator">/</div>
                    <el-button :disabled="idx === _currentPathArray.length -1"
                               style="font-weight: normal; cursor: auto;"
                               link
                               @click="setPathIdx(idx)" >{{item}}</el-button>

                </div>
            </div>
        </div>
        <el-divider ref="divToHeight" style="margin-top: 8px; margin-bottom: 8px"/>



        <div v-if="properties && currentElement" >
            <el-scrollbar :height="scrollHeight" always>
                <el-form label-position="top" style="padding: 0 16px 0 16px" ref="pageForm" :model="currentElement" size="small">
                    <el-form-item v-for="(prop, idx)  in properties.filter(item => !item.hidden)"
                                  style="margin-bottom: 8px;"
                                  :tabindex="idx"
                                  :show-message="false"
                                  :label="prop.type === 'bool' ? '' : prop.title"
                                  :required="prop.required || false"
                                  :prop="prop.alias">
                        <el-input v-if="prop.type === 'string'"
                                  :model-value="getValue(prop, currentElement)"
                                  @input="(val) => onInput(prop.alias, val)"
                        />
                        <el-input v-else-if="prop.type === 'text'"
                                  type="textarea"
                                  :autosize="{ minRows: 2, maxRows: 4 }"
                                  :model-value="getValue(prop, currentElement)"
                                  @input="(val) => onInput(prop.alias, val)"
                        />
                        <el-checkbox v-else-if="prop.type === 'bool'"
                                     :label="prop.title"
                                     :model-value="getValue(prop, currentElement)"
                                     @change="(val) => onInput(prop.alias, val)"
                        />
                        <el-select-v2 v-else-if="prop.type === 'dataset'"
                                      style="width: 100%"
                                      filterable
                                      :model-value="getValue(prop, currentElement)"
                                      :options="dataSetOptions"
                        />
                        <LinkSelect v-else-if="prop.type === 'link'"
                                    style="width: 100%"
                                    :config="prop"
                                    :model-value="getValue(prop, currentElement)"
                                    @change="(val) => onInput(prop.alias, val)"
                        />
                        <HandlerEditor v-else-if="prop.type === 'handler'"
                                       :type="getValue(prop, currentElement) ? getValue(prop, currentElement).type : 'script'"
                                       :script="getValue(prop, currentElement) ? getValue(prop, currentElement).script : ''"
                                       @update="(val) => onInput(prop.alias, val)"
                        />
                        <ItemList v-else-if="prop.type === 'list'"
                                  :list="getList(prop.alias)"
                                  :keyProp="prop.keyProp"
                                  :titleProp="prop.displayProp"
                                  @edit="(row) => onListEdit(prop.alias, row)"
                                  @insert="() => onListInsert(prop.alias, prop)"
                                  @remove="(row) => onListRemove(prop.alias, row)"
                        />
                        <div v-else style="color: var(--el-color-danger)">Don't have an element for type "{{prop.type}}"</div>
                    </el-form-item>
                </el-form>
            </el-scrollbar>
        </div>
    </div>
</template>

<script setup lang="ts">

import {onMounted, ref, watch} from "vue";
import {FieldConfigInterface} from "../model/field";
import {PageConfigInterface, pageProperties, PageTypesProperties} from "../model/page";
import HandlerEditor from "./HandlerEditor.vue";
import ItemList from "./ItemList.vue";
import _ from 'lodash'
import {useComponentService} from "../services/component.service";
import {useDataSourceService} from "../services/datasource.service";
import LinkSelect from "./LinkSelect.vue";


let componentService = useComponentService()
let dsService = useDataSourceService()



let pageForm = ref(null)
let dataSetOptions = ref([])
let divToHeight = ref(null)
let scrollHeight = ref(window.innerHeight)

let properties = ref<FieldConfigInterface[]>([])
let currentElement = ref(null)
let _currentPath = ''
let _currentPathArray = ref(['Path'])
let pageListTypesProperties = new PageTypesProperties()


const emit = defineEmits(['update'])
const props = defineProps<{
    pageConfig: PageConfigInterface,
    currentPath: string
}>()

watch(() => props,
    async () => {
        populateDataSetsList()
    },
    {
        deep: true
    })

watch(() => props.currentPath,
    async () => {
        setCurrentElement(props.currentPath ? props.currentPath : '')
    },
    {
        deep: true
    })

function setCurrentElement(cpath: string) {
    if (cpath === '') {
        properties.value = pageProperties
        currentElement.value = props.pageConfig

        _currentPath = cpath;
    } else {
        let fields = getFieldsByPath(cpath)
        if (!fields) {
            console.error(`List item not found for property path ${cpath}`)
            return;
        }

        properties.value = fields
        currentElement.value = _.get(props.pageConfig, cpath)
        _currentPath = cpath;
    }

    _currentPathArray.value = _currentPath !== "" ? _currentPath.split('.') : []
    _currentPathArray.value.splice(0, 0, 'Page');
}

function getPropPath(alias: string) {
    return  _currentPath !== '' ? _currentPath + '.' + alias : alias
}

function getList(prop: string) {
    return _.get(props.pageConfig, getPropPath(prop))
}

function setPathIdx(idx: number) {
    let path = ''
    for (let i = 1; i <= idx; i++) {
        if (path !== '') path += '.';
        path += _currentPathArray.value[i]
    }
    setCurrentElement(path)
}

function getFieldsByPath(path: string): FieldConfigInterface[] {
    let parentProps = pageProperties;
    let _path = _.toPath(path);

    for(let i in _path) {
        // !!! It's not a good way to determine a list element
        if (!Number.isNaN(Number.parseInt(_path[i])))
            continue;

        let prop = getFieldByAlias(parentProps, _path[i])

        if (prop.type !== 'list') {
            console.error(`Field's ${_path[i]} type isn't a list`)
            return undefined;
        }

        if (prop.listOf === 'element') {
            //Each element consists their own properties unlike of list types
            let el = _.get(props.pageConfig, buildPath(Number(i) + 1))

            let elProps = componentService.getByName(el.name)
            if (!elProps) {
                console.warn(`Component "${el.name}" not registered`)
                return undefined;
            }

            parentProps = elProps.properties
        } else {
            let listItemProps = pageListTypesProperties.getPropertiesByType(prop.listOf)

            if (!listItemProps) {
                console.error(`List item properties not found for type ${prop.listOf}`)
                return;
            }

            parentProps = listItemProps.fields
        }
    }

    function buildPath(count: number):any[] {
        let res = []
        for (let i = 0; i < count+1; i++) {
            res.push(_path[i])
        }
        return res
    }

    function getFieldByAlias(list: FieldConfigInterface[], alias: string):FieldConfigInterface {
        for(let i in list) {
            if (list[i].alias === alias) {
                return list[i]
            }
        }
        return undefined;
    }

    return parentProps;
}

function onListEdit(path:string, idx: number) {
    setCurrentElement(`${getPropPath(path)}[${idx}]`)
}

function onListInsert(alias:string, field: FieldConfigInterface) {
    let path = _currentPath !== '' ?  _currentPath + '.' + alias : alias;
    let list = _.get(props.pageConfig, path)

    if (list === undefined) {
        list = []
    }

    let n = {}
    n[field.keyProp] = `${field.listOf}${list.length + 1}`
    n[field.displayProp] = `${field.listOf}${list.length + 1}`

    list.push(n)

    emit('update', path, list)
}

function onListRemove(alias:string, idx: number) {
    let path = getPropPath(alias)
    let lst =_.get(props.pageConfig, path);
    lst.splice(idx, 1)
    emit('update', path, lst)
}

function populateDataSetsList() {
    dataSetOptions.value = props.pageConfig.dataSets.map(item => {
        return {
            value: item.alias,
            label: item.alias
        }
    })
}

onMounted(() => {
    if (divToHeight.value)
        scrollHeight.value = window.innerHeight - divToHeight.value.$el.offsetTop - 60
    populateDataSetsList()
    setCurrentElement('')
})

function onInput(alias: string, value: any) {
    emit('update', getPropPath(alias), value)
}

function getValue(prop: FieldConfigInterface, element: any) {
    return element[prop.alias]
}

</script>

<style lang="scss">

.panel {
    background: white;
    z-index: 0;
    width: 100%;
    //padding: 16px;

    .title {
        font-size: var(--el-font-size-medium);
    }

    .path {
        font-size: var(--el-font-size-small);
        display: flex;
        flex-flow: wrap;
    }

    .path-separator {
        padding-left: 4px;
        padding-right: 4px;
    }

    .el-scrollbar {
        height: unset;
    }
}



</style>