<!-- This README file is going to be the one displayed on the Grafana.com website for your plugin. Uncomment and replace the content here before publishing.

Remove any remaining comments before publishing as these may be displayed on Grafana.com -->

# Live Panel

# ✅ 已实现的功能
## 1. 多格式视频流支持
- m3u8 - 使用 hls.js 播放
- flv - 使用 flv.js 播放
- rtmp - 转换为 flv 格式播放
## 2. ClickHouse 数据源集成
- 自动从查询结果中提取 video_url 字段
- 支持多路流切换
- 无数据时回退到面板设置中的地址
## 3. 流状态监控
- 实时状态显示 - 播放中/缓冲中/错误/未播放
- 错误监控 - 显示具体错误信息
- 重试计数 - 记录重连次数
- 时间戳 - 显示最后更新时间
## 4. 用户界面
- 流切换下拉框 - 多路流时自动显示
- 状态监控面板 - 右上角显示实时状态
- 颜色指示器 - 绿色(播放中)、黄色(缓冲中)、红色(错误)、灰色(未播放)
# 🚀 使用方法
- 部署插件 - 将 dist 目录复制到 Grafana 插件目录
- 启用插件 - 在 Grafana 管理界面启用 "Live Panel"
- 创建面板 - 添加 "Live Panel" 到仪表盘
- 配置数据源 - 选择 ClickHouse 并编写包含 video_url 字段的查询
- 监控流状态 - 面板会自动显示流状态和错误信息
