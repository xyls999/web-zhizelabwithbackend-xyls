import { defineClientConfig } from 'vuepress/client'
import VisitorDashboard from './components/VisitorDashboard.vue'

export default defineClientConfig({
  enhance({ app }) {
    // 注册全局组件
    app.component('VisitorDashboard', VisitorDashboard)
  },
})

