import {FieldConfigInterface} from "../../model/field";

export function properties():FieldConfigInterface[] {
    return [
    {
        title: "Field",
        alias: "field",
        type: 'field'
    },{
        title: "Title",
        alias: "title",
        type: "string"
    },{
        title: "Readonly",
        alias: "readonly",
        type: 'bool',
        default: false
    }]
}