const {chromium} = require('playwright');
const fs = require('fs');
const axios = require("axios");

(async () => {
    if (!fs.existsSync('./data')) {
        fs.mkdirSync('./data');
    }
    const browser = await chromium.launch({
        channel: 'chrome',
        headless: false,
    });
    const context = await browser.newContext({
        locale: 'en-GB',
    });
    context.setDefaultTimeout(0);
    const nowTime = Math.floor(Date.now() / 1000);
    const page = await context.newPage();
    await page.goto('https://www.vinted.co.uk/');
    // 如果弹出并同意采集Cookies隐私
    try {
        await page.locator('span:has-text("Where do you live?")').waitFor({
            timeout: 3000,
        });
        await page.locator('span:has-text("United Kingdom")').click();
    } catch (e) {
        console.log(e.message)
    }
    try {
        await page.locator('h2:has-text("Your privacy preferences")').waitFor({
            timeout: 3000,
        });
        await page.locator('[aria-label="Your privacy preferences"] >> text=Accept all').click();
    } catch (e) {
        console.log(e.message)
    }
    for (let pageIndex = 1; pageIndex <= 125; pageIndex++) {
        // 先检查上一轮的是否执行完
        while (context.pages().length > 1) {
            await ((ms) => {
                return new Promise((resolve) => {
                    setTimeout(resolve, ms)
                });
            })(3000);
        }
        await page.goto('https://www.vinted.co.uk/women/clothes/dresses?catalog[]=10&time=' + nowTime + '&page=' + pageIndex);
        const items = await page.locator('div.feed-grid div.feed-grid__item:not(.feed-grid__item--full-row) div.ItemBox_image__3BPYe a');
        const index = await items.count();
        for (let i = 0; i < index; i++) {
            const itemUrl = await items.nth(i).getAttribute('href');
            const itemId = itemUrl.substring(itemUrl.lastIndexOf('/') + 1).substring(0, 10);
            const categoryStop = itemUrl.lastIndexOf('/');
            const categoryStart = itemUrl.lastIndexOf('/', categoryStop - 1);
            const itemCategory = itemUrl.substring(categoryStart + 1, categoryStop).replaceAll('-', ' ');
            const itemName = itemUrl.substring(itemUrl.lastIndexOf('/') + 1).substring(11);
            if (!fs.existsSync('./data/' + itemId)) {
                (async () => {
                    fs.mkdirSync('./data/' + itemId);
                    const itemPage = await context.newPage();
                    await itemPage.goto(itemUrl);
                    const title = await itemPage.locator('div.Cell_body__10a_u div[itemprop="name"] h2').innerText();
                    const text = await itemPage.locator('div.Cell_body__10a_u div.u-text-wrap span:not(.Text_text__QBn4-)').innerText();
                    const images = itemPage.locator('div.item-photos img');
                    let imageCount = await images.count();
                    // 改为全部下载
                    // imageCount = imageCount > 3 ? 3 : imageCount;
                    for (let imageIndex = 0; imageIndex < imageCount; imageIndex++) {
                        const imageUrl = await images.nth(imageIndex).getAttribute('data-src');
                        const imageType = imageUrl.substring(imageUrl.lastIndexOf('.'), imageUrl.lastIndexOf('?'));
                        await axios.get(imageUrl, {responseType: 'stream'})
                            .then((response) => {
                                const writer = fs.createWriteStream('./data/' + itemId + '/' + (imageIndex + 1) + imageType);
                                response.data.pipe(writer);
                            }).catch((error) => {
                                console.log(error);
                            });
                    }
                    fs.writeFileSync('./data/' + itemId + '/' + itemName + '.txt', title + '\n' + text);
                    await itemPage.close();
                })().then();
            }
        }
    }
    await page.close();
    while (context.pages().length != 0) {
        await ((ms) => {
            return new Promise((resolve) => {
                setTimeout(resolve, ms)
            });
        })(3000);
    }
    await context.close();
    await browser.close();
})();