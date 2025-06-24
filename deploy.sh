docker exec -it grafana rm -rf /var/lib/grafana/plugins/stream-live-panel
docker cp /Users/yangbo/Documents/ibaby/middle/grafana/live-panel/stream-live-panel/dist grafana:/var/lib/grafana/plugins/stream-live-panel
docker restart grafana
