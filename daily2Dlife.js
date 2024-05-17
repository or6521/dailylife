import plugin from '../../lib/plugins/plugin.js'
import { segment } from "icqq";
import lodash from 'lodash'
import moment from 'moment'
import fs from 'node:fs'

export class example extends plugin {
    constructor (){
        super({
            name: '抽二次元老婆',
            dsc: '抽二次元老婆',
            event: 'message',
            priority: 10,
            rule: [
                {
                    reg: "^#?抽老婆$",
                    fnc: 'get2DWife',
                }
            ]
        })
    };
    //工具方法
    getCurrentDate(){
        return moment().format('YYYY-MM-DD');
    };
    // 获取当前群成员列表
    async getCurrentGroupList(e){
        const groupInfo = await e.group.getGroupList();
        return Array.from(groupInfo.values());
    };
    // 获取存在redis中的群成员列表
    async getSavedGroupList(groupId){
        const info = await redis.get(`Yunzai:dailylife2D:${groupId}`);
        return JSON.parse(info) ?? [];
    };

    async get2DWife(e){
        let pathDef = 'resources/wife/'
        const files = fs.readdirSync(pathDef);
        const savedGroupList = await this.getSavedGroupList(e.group_id);
        // 已经有老婆的用户
        const curUser = savedGroupList.find(user => user.user_id === e.user_id);
        if(curUser && curUser.wifeDate === this.getCurrentDate() && curUser.wife){
            let msg = [
                segment.at(e.user_id),
                "\n你今天的二次元老婆是",
                segment.image(`https://q1.qlogo.cn/g?b=qq&s=0&nk=${curUser.wife}`),
                `【${curUser.wife}】`
            ];
            e.reply(msg);//发送完成
            return true;
        }
        // 清理今日已经成为别人老婆的用户
        files.filter(file => {
            return !savedGroupList.find(savedUser => savedUser.wife === file && savedUser.wifeDate === this.getCurrentDate());
        });
        const randomWife = lodash.sample(files);
        console.log(randomWife)
        let msg = [
            segment.at(e.user_id),
            `\n你今天的二次元老婆是${randomWife.split('.')[0]}`,
            segment.image(`resources/wife/${randomWife}`)
        ];
        e.reply(msg);//发送完成
        const userInfo = {
            user_id: e.user_id,
            wife: randomWife,
            wifeDate: this.getCurrentDate()
        };
        if(curUser){
            curUser.wife = randomWife;
            curUser.wifeDate = this.getCurrentDate();
        }else{
            savedGroupList.push(userInfo);
        }
        redis.set(`Yunzai:dailylife2D:${e.group_id}`, JSON.stringify(savedGroupList));
        return true;
    };
}