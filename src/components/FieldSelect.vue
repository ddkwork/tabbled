<template>
    <el-select
        filterable
        :model-value="modelValue"
        remote
        clearable
        remote-show-suffix
        :remote-method="getData"
        :loading="isLoading"
        @change="(val) => change(val)"
    >
        <el-option
            v-for="item in data"
            :key="item.key"
            :label="item.title"
            :value="item.key"
        />
    </el-select>
</template>

<script setup lang="ts">
import {onMounted, ref} from "vue";
import {useDataSourceService} from "../services/datasource.service";
import {DataSourceInterface} from "../model/datasource";

let isLoading = ref(false)
let data = ref<Array<{key: string, title: string}>>([])
let dsService = useDataSourceService()
let dataSource:DataSourceInterface = null

const props = defineProps<{
    dataSource?: string,
    modelValue?: string,
    size?: string
}>()

const emit = defineEmits(['change', 'update:modelValue'])

onMounted(async () => {
    await init();
    await getData()

})

async function init() {
    console.log('init field select', props.dataSource)
    if(!props.dataSource)
        return;

    dataSource = await dsService.getByAlias(props.dataSource)



    if (!dataSource) {
        console.warn(`No dataSource with alias "${props.dataSource}"`)
    }
}

async function getData() {
    isLoading.value = true;
    data.value = []

    if (!dataSource)
        return

    for(const i in dataSource.fields) {
        const f = dataSource.fields[i]
        data.value.push({
            key: f.alias,
            title: `${f.title} (${f.alias})`
        })
    }

    let links = dataSource.fields.filter((f) => f.type === 'link' && f.datasource)

    for(let i in links) {
        let link = links[i]

        let ds = await dsService.getByAlias(link.datasource)
        if (!ds) continue

        ds.fields.forEach(f => {
            if (!['table'].includes(f.type))
                data.value.push({
                    key: `${link.alias}->${f.alias}`,
                    title: `${link.title} -> ${f.title} (${link.alias}->${f.alias})`
                })
        })
    }

    isLoading.value = false;
}

async function change(key: string) {
    let ds = await dsService.getByAlias(props.dataSource)
    let field = ds.getFieldByAlias(key)

    emit('change', key, field)
    emit('update:modelValue', key, field)
}

</script>

<style scoped>

</style>