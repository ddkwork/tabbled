<template>
    <div style="max-width: 300px; margin: auto">

    <div style="padding-top: 24px;"></div>
        <div style="display: flex; align-items: center; justify-content: center; padding-bottom: 24px">
            <img height="60" class="logo" :src="favicon" alt=""/>
            <span style="font-size: 30px; padding-left: 16px">{{title}}</span>
        </div>

    <h3 style="text-align: center; width: 300px">{{$t('signIn')}}</h3>
    <el-card shadow="never" class="p-0 m-0">



        <el-form class="p-0 m-0" hide-required-asterisk label-position="top" ref="form" :model="user" :rules="rules">

            <el-form-item :label="$t('username')" required prop="username" >
                <el-input v-model="user.username" v-on:keyup.enter="login"/>
            </el-form-item>

            <el-form-item :label="$t('password')" required prop="password">
                <el-input v-on:keyup.enter="login"
                          type="password"
                          show-password
                          v-model="user.password"
                />
            </el-form-item>

        </el-form>



        <el-row>
            <el-button type="primary" style="width: 100%" @click="login">{{$t('login')}}</el-button>
        </el-row>
    </el-card>
    </div>

</template>

<script setup lang="ts">

import {onMounted, ref} from "vue";
import {useRoute, useRouter} from 'vue-router'
import {useStore} from "vuex";
import { ElMessage } from 'element-plus'
import {useSettings} from "../services/settings.service";


const router = useRouter();
const store = useStore();
const route = useRoute()
const settings = useSettings()

let favicon = ref('/favicon.png')
let title = ref('Tabbled')
let form = ref(null)
let user = ref({
    username: "",
    password: ""
})
let rules = ref({
    username: [{
        required: true,
        trigger: 'blur',
    }],
        password: [{
        required: true,
        trigger: 'blur',
    }]
})

onMounted(async () => {
    favicon.value = window['env']['appFavicon'] ? window['env']['appFavicon'] : "/favicon.png"
    title.value = window['env']['appTitle'] ? window['env']['appTitle'] : "Tabbled"
    document.title = `${route.meta.title} | ${ title.value }`
})


async function login() {
    let valid = await validate();
    if (!valid)
        return;

    try {
        await store.dispatch('auth/login', {
            username: user.value.username,
            password: user.value.password
        });

        ElMessage.success('Logged in')
        router.push(route.redirectedFrom ? route.redirectedFrom : '/');

    } catch (e: any) {
        console.error(e)
        ElMessage.error(e.toString())
    }
}

function validate() {
    return new Promise((resolve, reject) => {
        if (!form.value) {
            reject()
            return;
        }
        form.value.validate(async (b) => {
            resolve(b);
        })
    })
}

</script>

<style scoped>

</style>