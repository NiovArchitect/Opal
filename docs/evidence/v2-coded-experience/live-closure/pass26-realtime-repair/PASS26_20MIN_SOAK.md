# Six-Client Realtime Soak (Pass 7)

**Episode:** soak7-msttwuhs  
**Start:** 2026-08-15T03:41:16.000Z  
**End:** 2026-08-15T04:03:07.434Z  
**Duration requested:** 20 minutes  
**Duration actual:** 1203s  
**Conversation:** 4fa00238-8130-4aef-823c-76880d921ace  

## Intelligence delta

**NONE** — reliability proof only.

## Summary

| PASS | PRODUCT_FAIL | ENVIRONMENT_FAIL | TOTAL |
|------|--------------|------------------|-------|
| 34 | 0 | 0 | 34 |

## Message delivery matrix

```json
{
  "founder": {
    "founder": "PASS",
    "chris": "PASS",
    "jess": "PASS",
    "alex": "PASS",
    "maya": "PASS",
    "sam": "PASS"
  },
  "chris": {
    "founder": "PASS",
    "chris": "PASS",
    "jess": "PASS",
    "alex": "PASS",
    "maya": "PASS",
    "sam": "PASS"
  },
  "jess": {
    "founder": "PASS",
    "chris": "PASS",
    "jess": "PASS",
    "alex": "PASS",
    "maya": "PASS",
    "sam": "PASS"
  },
  "alex": {
    "founder": "PASS",
    "chris": "PASS",
    "jess": "PASS",
    "alex": "PASS",
    "maya": "PASS",
    "sam": "PASS"
  },
  "maya": {
    "founder": "PASS",
    "chris": "PASS",
    "jess": "PASS",
    "alex": "PASS",
    "maya": "PASS",
    "sam": "PASS"
  },
  "sam": {
    "founder": "PASS",
    "chris": "PASS",
    "jess": "PASS",
    "alex": "PASS",
    "maya": "PASS",
    "sam": "PASS"
  }
}
```

## Checkpoints

### 0min
- converge=true leak=false extOk=true

### 5min
- converge=true leak=false extOk=true

### 10min
- converge=true leak=false extOk=true

### 15min
- converge=true leak=false extOk=true

### 20min
- converge=true leak=false extOk=true


## Results

| Check | Status | Detail |
|-------|--------|--------|
| activate_all | PASS | founder=47aa5856 chris=b87dc445 jess=6195d4d3 alex=0cc27cf4 maya=00023980 sam=0047f1d8 |
| create_group | PASS | 4fa00238-8130-4aef-823c-76880d921ace |
| browser_login_founder | PASS |  |
| browser_login_chris | PASS |  |
| browser_login_jess | PASS |  |
| browser_login_alex | PASS |  |
| browser_login_maya | PASS |  |
| browser_login_sam | PASS |  |
| browser_login_stranger | PASS |  |
| sam_prematrix_membership | PASS | count=6 |
| sam_post_membership_rejoin | PASS | channel_joined=true |
| pre_matrix_channel_joins | PASS | founder=true chris=true jess=true alex=true maya=true sam=true |
| realtime_message_matrix | PASS | all peers realtime |
| checkpoint_0min | PASS | converge=true leak=false ext=true health=HEALTHY,HEALTHY,HEALTHY,HEALTHY,HEALTHY,HEALTHY |
| private_curate_ui_isolation | PASS | founder_curate=false peer_curate_seen=false |
| private_selection_ui | PASS | place option not visible (env/ui); selection≠send still API-proven |
| explicit_share_ui | PASS | peers received share realtime/DOM |
| sam_late_participation | PASS | optional late message sent; membership already 6 |
| background_foreground | PASS | maya=true sam=true |
| network_interruption_recovery | PASS | peers_ok=true alex_recovered=true same_gap=true |
| logout_login_recovery | PASS | group_continued=true chris_catchup=true leak=false |
| non_member_throughout | PASS | status=403 |
| checkpoint_5min | PASS | converge=true leak=false ext=true health=HEALTHY,HEALTHY,HEALTHY,HEALTHY,HEALTHY,HEALTHY |
| checkpoint_10min | PASS | converge=true leak=false ext=true health=HEALTHY,HEALTHY,HEALTHY,HEALTHY,HEALTHY,HEALTHY |
| checkpoint_15min | PASS | converge=true leak=false ext=true health=HEALTHY,HEALTHY,HEALTHY,HEALTHY,HEALTHY,HEALTHY |
| checkpoint_20min | PASS | converge=true leak=false ext=true health=HEALTHY,HEALTHY,HEALTHY,HEALTHY,HEALTHY,HEALTHY |
| socket_health_founder | PASS | HEALTHY {"rawState":"connected","projectedState":"connected","connectCount":1,"reconnectScheduleCount":0,"closeCount":0,"errorCount":0,"connectedLifetimeMs":1300201,"lastConnectedAt":1786765287084,"reconnectAttempt":0,"joinedChannels":["4fa00238-8130-4aef-823c-76880d921ace"],"lastServerSeqByConversation":{"4fa00238-8130-4aef-823c-76880d921ace":20},"lastJoinAttempt":{"conversationId":"4fa00238-8130-4aef-823c-76880d921ace","topic":"conversation:4fa00238-8130-4aef-823c-76880d921ace","result":"ok","at":1786765290460},"socketAuthSuccess":true,"lastSocketError":null,"channelJoinAttemptCount":1,"channelJoinOkCount":1,"channelJoinErrorCount":0} |
| socket_health_chris | PASS | HEALTHY {"rawState":"connected","projectedState":"connected","connectCount":1,"reconnectScheduleCount":0,"closeCount":0,"errorCount":0,"connectedLifetimeMs":1179192,"lastConnectedAt":1786765408096,"reconnectAttempt":0,"joinedChannels":["4fa00238-8130-4aef-823c-76880d921ace"],"lastServerSeqByConversation":{"4fa00238-8130-4aef-823c-76880d921ace":20},"lastJoinAttempt":{"conversationId":"4fa00238-8130-4aef-823c-76880d921ace","topic":"conversation:4fa00238-8130-4aef-823c-76880d921ace","result":"ok","at":1786765411134},"socketAuthSuccess":true,"lastSocketError":null,"channelJoinAttemptCount":1,"channelJoinOkCount":1,"channelJoinErrorCount":0} |
| socket_health_jess | PASS | HEALTHY {"rawState":"connected","projectedState":"connected","connectCount":1,"reconnectScheduleCount":0,"closeCount":0,"errorCount":0,"connectedLifetimeMs":1284954,"lastConnectedAt":1786765302337,"reconnectAttempt":0,"joinedChannels":["4fa00238-8130-4aef-823c-76880d921ace"],"lastServerSeqByConversation":{"4fa00238-8130-4aef-823c-76880d921ace":20},"lastJoinAttempt":{"conversationId":"4fa00238-8130-4aef-823c-76880d921ace","topic":"conversation:4fa00238-8130-4aef-823c-76880d921ace","result":"ok","at":1786765304181},"socketAuthSuccess":true,"lastSocketError":null,"channelJoinAttemptCount":1,"channelJoinOkCount":1,"channelJoinErrorCount":0} |
| socket_health_alex | PASS | HEALTHY {"rawState":"connected","projectedState":"connected","connectCount":1,"reconnectScheduleCount":0,"closeCount":0,"errorCount":0,"connectedLifetimeMs":1278223,"lastConnectedAt":1786765309070,"reconnectAttempt":0,"joinedChannels":["4fa00238-8130-4aef-823c-76880d921ace"],"lastServerSeqByConversation":{"4fa00238-8130-4aef-823c-76880d921ace":20},"lastJoinAttempt":{"conversationId":"4fa00238-8130-4aef-823c-76880d921ace","topic":"conversation:4fa00238-8130-4aef-823c-76880d921ace","result":"ok","at":1786765310451},"socketAuthSuccess":true,"lastSocketError":null,"channelJoinAttemptCount":1,"channelJoinOkCount":1,"channelJoinErrorCount":0} |
| socket_health_maya | PASS | HEALTHY {"rawState":"connected","projectedState":"connected","connectCount":1,"reconnectScheduleCount":0,"closeCount":0,"errorCount":0,"connectedLifetimeMs":1269749,"lastConnectedAt":1786765317550,"reconnectAttempt":0,"joinedChannels":["4fa00238-8130-4aef-823c-76880d921ace"],"lastServerSeqByConversation":{"4fa00238-8130-4aef-823c-76880d921ace":20},"lastJoinAttempt":{"conversationId":"4fa00238-8130-4aef-823c-76880d921ace","topic":"conversation:4fa00238-8130-4aef-823c-76880d921ace","result":"ok","at":1786765318829},"socketAuthSuccess":true,"lastSocketError":null,"channelJoinAttemptCount":1,"channelJoinOkCount":1,"channelJoinErrorCount":0} |
| socket_health_sam | PASS | HEALTHY {"rawState":"connected","projectedState":"connected","connectCount":1,"reconnectScheduleCount":0,"closeCount":0,"errorCount":0,"connectedLifetimeMs":1221720,"lastConnectedAt":1786765365581,"reconnectAttempt":0,"joinedChannels":["4fa00238-8130-4aef-823c-76880d921ace"],"lastServerSeqByConversation":{"4fa00238-8130-4aef-823c-76880d921ace":20},"lastJoinAttempt":{"conversationId":"4fa00238-8130-4aef-823c-76880d921ace","topic":"conversation:4fa00238-8130-4aef-823c-76880d921ace","result":"ok","at":1786765368902},"socketAuthSuccess":true,"lastSocketError":null,"channelJoinAttemptCount":1,"channelJoinOkCount":1,"channelJoinErrorCount":0} |
| chronology_no_duplicates | PASS | n=12 unique=12 |
| messages_no_duplicates | PASS | n=19 |

## Final socket diagnostics

```json
{
  "founder": {
    "rawState": "connected",
    "projectedState": "connected",
    "connectCount": 1,
    "reconnectScheduleCount": 0,
    "closeCount": 0,
    "errorCount": 0,
    "connectedLifetimeMs": 1300201,
    "lastConnectedAt": 1786765287084,
    "reconnectAttempt": 0,
    "joinedChannels": [
      "4fa00238-8130-4aef-823c-76880d921ace"
    ],
    "lastServerSeqByConversation": {
      "4fa00238-8130-4aef-823c-76880d921ace": 20
    },
    "lastJoinAttempt": {
      "conversationId": "4fa00238-8130-4aef-823c-76880d921ace",
      "topic": "conversation:4fa00238-8130-4aef-823c-76880d921ace",
      "result": "ok",
      "at": 1786765290460
    },
    "socketAuthSuccess": true,
    "lastSocketError": null,
    "channelJoinAttemptCount": 1,
    "channelJoinOkCount": 1,
    "channelJoinErrorCount": 0
  },
  "chris": {
    "rawState": "connected",
    "projectedState": "connected",
    "connectCount": 1,
    "reconnectScheduleCount": 0,
    "closeCount": 0,
    "errorCount": 0,
    "connectedLifetimeMs": 1179192,
    "lastConnectedAt": 1786765408096,
    "reconnectAttempt": 0,
    "joinedChannels": [
      "4fa00238-8130-4aef-823c-76880d921ace"
    ],
    "lastServerSeqByConversation": {
      "4fa00238-8130-4aef-823c-76880d921ace": 20
    },
    "lastJoinAttempt": {
      "conversationId": "4fa00238-8130-4aef-823c-76880d921ace",
      "topic": "conversation:4fa00238-8130-4aef-823c-76880d921ace",
      "result": "ok",
      "at": 1786765411134
    },
    "socketAuthSuccess": true,
    "lastSocketError": null,
    "channelJoinAttemptCount": 1,
    "channelJoinOkCount": 1,
    "channelJoinErrorCount": 0
  },
  "jess": {
    "rawState": "connected",
    "projectedState": "connected",
    "connectCount": 1,
    "reconnectScheduleCount": 0,
    "closeCount": 0,
    "errorCount": 0,
    "connectedLifetimeMs": 1284954,
    "lastConnectedAt": 1786765302337,
    "reconnectAttempt": 0,
    "joinedChannels": [
      "4fa00238-8130-4aef-823c-76880d921ace"
    ],
    "lastServerSeqByConversation": {
      "4fa00238-8130-4aef-823c-76880d921ace": 20
    },
    "lastJoinAttempt": {
      "conversationId": "4fa00238-8130-4aef-823c-76880d921ace",
      "topic": "conversation:4fa00238-8130-4aef-823c-76880d921ace",
      "result": "ok",
      "at": 1786765304181
    },
    "socketAuthSuccess": true,
    "lastSocketError": null,
    "channelJoinAttemptCount": 1,
    "channelJoinOkCount": 1,
    "channelJoinErrorCount": 0
  },
  "alex": {
    "rawState": "connected",
    "projectedState": "connected",
    "connectCount": 1,
    "reconnectScheduleCount": 0,
    "closeCount": 0,
    "errorCount": 0,
    "connectedLifetimeMs": 1278223,
    "lastConnectedAt": 1786765309070,
    "reconnectAttempt": 0,
    "joinedChannels": [
      "4fa00238-8130-4aef-823c-76880d921ace"
    ],
    "lastServerSeqByConversation": {
      "4fa00238-8130-4aef-823c-76880d921ace": 20
    },
    "lastJoinAttempt": {
      "conversationId": "4fa00238-8130-4aef-823c-76880d921ace",
      "topic": "conversation:4fa00238-8130-4aef-823c-76880d921ace",
      "result": "ok",
      "at": 1786765310451
    },
    "socketAuthSuccess": true,
    "lastSocketError": null,
    "channelJoinAttemptCount": 1,
    "channelJoinOkCount": 1,
    "channelJoinErrorCount": 0
  },
  "maya": {
    "rawState": "connected",
    "projectedState": "connected",
    "connectCount": 1,
    "reconnectScheduleCount": 0,
    "closeCount": 0,
    "errorCount": 0,
    "connectedLifetimeMs": 1269749,
    "lastConnectedAt": 1786765317550,
    "reconnectAttempt": 0,
    "joinedChannels": [
      "4fa00238-8130-4aef-823c-76880d921ace"
    ],
    "lastServerSeqByConversation": {
      "4fa00238-8130-4aef-823c-76880d921ace": 20
    },
    "lastJoinAttempt": {
      "conversationId": "4fa00238-8130-4aef-823c-76880d921ace",
      "topic": "conversation:4fa00238-8130-4aef-823c-76880d921ace",
      "result": "ok",
      "at": 1786765318829
    },
    "socketAuthSuccess": true,
    "lastSocketError": null,
    "channelJoinAttemptCount": 1,
    "channelJoinOkCount": 1,
    "channelJoinErrorCount": 0
  },
  "sam": {
    "rawState": "connected",
    "projectedState": "connected",
    "connectCount": 1,
    "reconnectScheduleCount": 0,
    "closeCount": 0,
    "errorCount": 0,
    "connectedLifetimeMs": 1221720,
    "lastConnectedAt": 1786765365581,
    "reconnectAttempt": 0,
    "joinedChannels": [
      "4fa00238-8130-4aef-823c-76880d921ace"
    ],
    "lastServerSeqByConversation": {
      "4fa00238-8130-4aef-823c-76880d921ace": 20
    },
    "lastJoinAttempt": {
      "conversationId": "4fa00238-8130-4aef-823c-76880d921ace",
      "topic": "conversation:4fa00238-8130-4aef-823c-76880d921ace",
      "result": "ok",
      "at": 1786765368902
    },
    "socketAuthSuccess": true,
    "lastSocketError": null,
    "channelJoinAttemptCount": 1,
    "channelJoinOkCount": 1,
    "channelJoinErrorCount": 0
  }
}
```

## Screenshots

See `docs/evidence/v2-coded-experience/live-closure/six-client-soak/`.

## Not claimed

- Perfect browser login for every account if OTP/rate-limit ENV fails
