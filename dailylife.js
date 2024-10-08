import plugin from '../../lib/plugins/plugin.js'
import { segment } from "icqq";
import moment from 'moment'
import lodash from 'lodash'

export class example extends plugin {
    constructor (){
        super({
            name: '每日老婆',
            dsc: '每日老婆',
            event: 'message',
            priority: 10,
            rule: [
                {
                    reg: "^#?今日老婆$",
                    fnc: 'GetDailyWife',
                },
                {
                    reg: "^#?离婚$",
                    fnc: 'handleDivorce'
                },
                {
                    reg: "^#?ntr$",
                    fnc: 'handleNTR'
                },
                {
                    reg: "^#?纯爱锁$",
                    fnc: 'handleLockWife'
                },
                {
                    reg: "^#?别牛我$",
                    fnc: 'handleBeGreen'
                },
            ]
        })
    };

    // 工具方法
    getCurrentDate(){
        return moment().format('YYYY-MM-DD');
    };

    // 当用户存在但日期不是今天时，重置用户数据
    resetUser(user){
        if(user && user.wifeDate !== this.getCurrentDate()){
            user.wifeId = null;
            user.wifeName = null;
            user.wifeDate = null;
            user.ntrDate = null;
            user.lockDate = null;
            user.isDivorced = false;
            user.ntredDate = null;
        }
    };

    // 获取当前群成员列表
    async getCurrentGroupList(e){
        const groupInfo = await e.group.getMemberMap();
        return Array.from(groupInfo.values());
    };

    // 获取存在 Redis 中的群成员列表
    async getSavedGroupList(groupId){
        const info = await redis.get(`Yunzai:dailylife:${groupId}`);
        return JSON.parse(info) ?? [];
    };

    async handleBeGreen(e){
        let target = e.message.filter(m => m.type === 'at')
        if(!target[0]){
            let msg = ['你想求谁别牛你？'];
            e.reply(msg);
            return;
        }
        let targetId = target[0].qq;
        let targetName = target[0].text;
        // 获取群成员列表
        const savedGroupList = await this.getSavedGroupList(e.group_id);
        const curUser = savedGroupList.find(user => user.user_id === e.user_id);
        this.resetUser(curUser);
        if(!curUser || !curUser.wifeId || curUser.wifeDate !== this.getCurrentDate()){
            let msg = ['你今天还没有老婆呢～'];
            e.reply(msg);
            return;
        }
        if(curUser && curUser.ntredDate === this.getCurrentDate()){
            let msg = ['你今天已经主动献妻了，一位群纯爱战士已经标记了你'];
            e.reply(msg);
            return;
        }
        const targetUser = savedGroupList.find(user => user.user_id === target[0].qq);
        if(targetUser && targetUser.lockDate === this.getCurrentDate()){
            let msg = ['牛头人给爷死！'];
            e.reply(msg);
            return;
        }
        let msg = [
            segment.at(e.user_id),
            `\n${targetName}成功 ntr 了你，得到了你的老婆：`,
            segment.image(`https://q1.qlogo.cn/g?b=qq&s=0&nk=${curUser.wifeId}`),
            `【${curUser.wifeName}】(${curUser.wifeId})`
        ];
        e.reply(msg);
        const targetInfo = {
            user_id: targetId,
            nickname: targetName,
            wifeId: curUser.wifeId,
            wifeName: curUser.wifeName,
            wifeDate: this.getCurrentDate(),
        };
        if(targetUser){
            targetUser.wifeId = curUser.wifeId;
            targetUser.wifeName = curUser.wifeName;
            targetUser.wifeDate = this.getCurrentDate();
        }else{
            savedGroupList.push(targetInfo);
        }
        curUser.ntredDate = this.getCurrentDate();
        curUser.wifeId = null;
        curUser.wifeName = null;
        redis.set(`Yunzai:dailylife:${e.group_id}`, JSON.stringify(savedGroupList));
        return;
    }

    async handleLockWife(e){
        // 获取群成员列表
        const savedGroupList = await this.getSavedGroupList(e.group_id);
        const curUser = savedGroupList.find(user => user.user_id === e.user_id);
        this.resetUser(curUser);
        // 已经有老婆的用户
        if(curUser && curUser.wifeDate === this.getCurrentDate() && curUser.wifeId){
            let msg = ['让我们来猎杀那些陷入黑暗中的牛头人吧！'];
            e.reply(msg);
            curUser.lockDate = this.getCurrentDate();
            redis.set(`Yunzai:dailylife:${e.group_id}`, JSON.stringify(savedGroupList));
            return;
        }else{
            let msg = ['你今天还没有老婆呢～'];
            e.reply(msg);
            return;
        }
    }

    async handleNTR(e){
        const target = e.message.filter(m => m.type === 'at')
        if(!target[0]){
            let msg = ['你要牛谁？'];
            e.reply(msg);
            return;
        }
        // 获取群成员列表
        const savedGroupList = await this.getSavedGroupList(e.group_id);
        const curUser = savedGroupList.find(user => user.user_id === e.user_id);
        // 不需要重置，因为可以凭空牛人
        if(curUser && curUser.ntrDate === this.getCurrentDate()){
            let msg = ['你今天已经 NTR 过了，牛头虽好，可不要贪杯哦～'];
            e.reply(msg);
            return;
        }
        const targetUser = savedGroupList.find(user => user.user_id === target[0].qq);
        if(!targetUser || targetUser.wifeDate !== this.getCurrentDate() || !targetUser.wifeId){
            let msg = ['ta还没有老婆呢，你牛了个寂寞'];
            e.reply(msg);
            return;
        }
        if(targetUser.lockDate === this.getCurrentDate()){
            let msg = ['牛头人给爷死！'];
            e.reply(msg);
            return;
        }
        let msg = [
            segment.at(e.user_id),
            `\n你成功 ntr 了 ${targetUser.nickname}，得到了 ta 的老婆：`,
            segment.image(`https://q1.qlogo.cn/g?b=qq&s=0&nk=${targetUser.wifeId}`),
            `【${targetUser.wifeName}】(${targetUser.wifeId})`
        ];
        e.reply(msg);
        // 更新数据
        const curUserInfo = {
            user_id: e.user_id,
            nickname: e.nickname,
            wifeId: targetUser.wifeId,       // 修正为目标用户的老婆
            wifeName: targetUser.wifeName,   // 修正为目标用户的老婆名字
            wifeDate: this.getCurrentDate(),
            ntrDate: this.getCurrentDate(),
        }
        if (curUser) {
            curUser.wifeId = targetUser.wifeId;      // 修正为目标用户的老婆
            curUser.wifeName = targetUser.wifeName;  // 修正为目标用户的老婆名字
            curUser.wifeDate = this.getCurrentDate();
            curUser.ntrDate = this.getCurrentDate();
        }else{
            savedGroupList.push(curUserInfo);
        }
        targetUser.wifeId = null;
        targetUser.wifeName = null;
        redis.set(`Yunzai:dailylife:${e.group_id}`, JSON.stringify(savedGroupList));
        return;
    }

    async handleDivorce(e){
        // 获取群成员列表
        const savedGroupList = await this.getSavedGroupList(e.group_id);
        let curUser = savedGroupList.find(user => user.user_id === e.user_id);
        this.resetUser(curUser);
        if(!curUser || curUser.wifeDate !== this.getCurrentDate() || !curUser.wifeId){
            let msg = ['你今天还没有老婆呢～'];
            e.reply(msg);
            return;
        }
        if(curUser.isDivorced){
            let msg = ['你今天已经离过婚了，求求你给其他群友一点念想吧'];
            e.reply(msg);
            return;
        }
        const msg = e.sender?.sex === 'male' ? '呸，渣男！' : '呸，渣女！'
        e.reply(msg);
        // 更新数据
        curUser.isDivorced = true;
        curUser.wifeId = null;
        curUser.wifeName = null;
        redis.set(`Yunzai:dailylife:${e.group_id}`, JSON.stringify(savedGroupList));
    }

    async GetDailyWife(e) {
        // 获取群成员列表
        const curGroupList = await this.getCurrentGroupList(e);
        const savedGroupList = await this.getSavedGroupList(e.group_id);
        // 已经有老婆的用户
        const curUser = savedGroupList.find(user => user.user_id === e.user_id);
        this.resetUser(curUser);
        if(curUser && curUser.wifeDate === this.getCurrentDate() && curUser.wifeId){
            let msg = [
                segment.at(e.user_id),
                "\n你今天的群老婆是",
                segment.image(`https://q1.qlogo.cn/g?b=qq&s=0&nk=${curUser.wifeId}`),
                `【${curUser.wifeName}】(${curUser.wifeId})`
            ];
            e.reply(msg);
            return true;
        }
        // 清理今日已经成为别人老婆的用户和自己
        const tempList = curGroupList.filter(curUser => {
            const isWifeIdMatchedAndDateIsToday = savedGroupList.some(savedUser => {
                return savedUser.wifeId === curUser.user_id && savedUser.wifeDate === this.getCurrentDate();
            });
            return !isWifeIdMatchedAndDateIsToday && curUser.user_id !== e.user_id;
        });
        const randomWife = lodash.sample(tempList);
        // 发送老婆
        let msg = [
            segment.at(e.user_id),
            "\n你今天的群老婆是",
            segment.image(`https://q1.qlogo.cn/g?b=qq&s=0&nk=${randomWife.user_id}`),
            `【${randomWife.card || randomWife.nickname}】(${randomWife.user_id})`
        ];
        e.reply(msg);
        // 更新群成员列表今日老婆信息
        const userInfo = {
            user_id: e.user_id,
            nickname: e.card || e.nickname,
            wifeId: randomWife.user_id,
            wifeName: randomWife.card || randomWife.nickname,
            wifeDate: this.getCurrentDate(),
        }
        if (curUser) {
            curUser.wifeId = randomWife.user_id;
            curUser.wifeName = randomWife.card || randomWife.nickname;
            curUser.wifeDate = this.getCurrentDate();
        }else{
            savedGroupList.push(userInfo);
        }
        redis.set(`Yunzai:dailylife:${e.group_id}`, JSON.stringify(savedGroupList));
        return true;
    }
}
