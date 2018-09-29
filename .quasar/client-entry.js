/**
 * THIS FILE IS GENERATED AUTOMATICALLY.
 * DO NOT EDIT.
 *
 * You are probably looking on adding initialization code.
 * Use "quasar new plugin <name>" and add it there.
 * One plugin per concern. Then reference the file(s) in quasar.conf.js > plugins:
 * plugins: ['file', ...] // do not add ".js" extension to it.
 **/



import 'quasar-extras/roboto-font/roboto-font.css'

import 'quasar-extras/material-icons/material-icons.css'

import 'quasar-extras/ionicons/ionicons.css'




import 'quasar-app-styl'


import 'src/css/app.styl'


import Vue from 'vue'
import createApp from './app.js'




import pAxios from 'src/plugins/axios'







import electron from 'electron'
Vue.prototype.$q.electron = electron








const { app, router } = createApp()




;[pAxios].forEach(plugin => {
  plugin({
    app,
    router,
    
    Vue,
    ssrContext: null
  })
})









new Vue(app)






