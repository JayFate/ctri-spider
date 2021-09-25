import * as fs from "fs";
import * as path from "path";
import * as puppeteer from "puppeteer";
import * as parse5 from "parse5";

const YAML = require('json-to-pretty-yaml');

const iPhone = puppeteer.devices['iPhone 6'];
const cityMap = Object.create(null)
let url = `https://m.ctrip.com/webapp/you/gspoi/sight/26.html?seo=0&isHideNavBar=YES&from=https%3A%2F%2Fm.ctrip.com%2Fwebapp%2Fyou%2Fgsdestination%2Fplace%2F26.html%3Fseo%3D0%26ishideheader%3Dtrue%26fromcitylist%3Dyes`

    ; (async () => {
        const browser = await puppeteer.launch({
            headless: false,
            defaultViewport: {
                width: 2500,
                height: 2000,
            }
        });
        let page = await browser.newPage();
        await page.emulate(iPhone);
        await page.setViewport({
            width: 1000,
            height: 2000,
            deviceScaleFactor: 1,
        });
        await page.goto(url);
        await scrollDown(page);
        await page.waitForTimeout(1000)
        await scrollDown(page);
        await page.waitForTimeout(1000)
        await scrollDown(page);
        await page.waitForTimeout(1000)
        const results = await page.$$eval('.sightListScrollView > div', ret => {
            return Array.from(ret).slice(1, 100).map(e => e.outerHTML)
        })
        const itemobjs = results.map(r => ((parse5.parseFragment(r).childNodes[0] as any).attrs as Array<any>).filter(e => e.name === "itemobj")[0]).map(attr => JSON.parse(attr.value))
        // console.log(itemobjs)
        page = await browser.newPage();
        await page.emulate(iPhone);
        await page.setViewport({
            width: 1000,
            height: 2000,
            deviceScaleFactor: 1,
        });
        url = `https://lbs.qq.com/getPoint/`
        await page.goto(url);
        await page.click('#city-select')
        await page.waitForTimeout(1000)
        // @ts-ignore
        await page.evaluate(() => Array.from(document.querySelectorAll('.city-select-popover li span')).filter(e => e.innerHTML.match('深圳'))[0].click())
        for (let i = 0; i < itemobjs.length; i++) {
            const name = itemobjs[i].poiName.replace(/\(*.\)/, '').replace(/（*.）/, '')
            // （东门老街旗舰店）
            // @ts-ignore
            for (let index = 0; index < 30; index++) {
                await page.keyboard.press('Backspace');
            }
            await page.type('.el-input.el-input--suffix input', name + '\n', { delay: 100 }); // Types slower, like a user
            await page.waitForTimeout(200)
            let v = await page.$eval('#location', e => {
                // @ts-ignore
                return Promise.resolve(e.value)
            })
            while (v === '-') {
                console.log('while')
                await page.click('#city-select')
                await page.waitForTimeout(1000)
                // @ts-ignore
                await page.evaluate(() => Array.from(document.querySelectorAll('.city-select-popover li span')).filter(e => e.innerHTML.match('深圳'))[0].click())
                await page.type('.el-input.el-input--suffix input', '\n', { delay: 100 }); // Types slower, like a user
                await page.waitForTimeout(200)
                v = await page.$eval('#location', e => {
                    // @ts-ignore
                    return Promise.resolve(e.value)
                })
            }
            console.log(`v`, v)
            itemobjs[i].position = v
            // await page.waitForTimeout(1000)
        }

        cityMap['深圳'] = itemobjs
        fs.writeFileSync(path.resolve(__dirname, '../out.json'), JSON.stringify(cityMap, null, 2))
        fs.writeFileSync(path.resolve(__dirname, '../out.yml'), YAML.stringify(cityMap))
        await browser.close();
    })();

async function scrollDown(page: puppeteer.Page) {
    await page.waitForSelector('.sightListScrollView:last-child')
    await page.$eval('.sightListScrollView:last-child', e => {
        e.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'end' });
    });
}