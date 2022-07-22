const {chromium} = require('playwright');
const axios = require('axios').default;

(async () => {
    const browser = await chromium.launch({
        channel: 'chrome',
        headless: false,
    });
    const context = await browser.newContext({
        locale: 'en-GB',
    });
    context.setDefaultTimeout(0);
    while (true) {
        let pid = '';
        await axios.get('http://curtsy.dvfpay.com/verify.php')
            .then((response) => {
                pid = response.data;
            }).catch((error) => {
                console.log(error);
            });
        if (pid !== '') {
            const page = await context.newPage();
            await page.goto('https://curtsyapp.com/item/' + pid);
            let status = 2;
            try {
                await page.locator('div.text-container p.sold-notice:has-text("This item is not available.")').waitFor({
                    timeout: 1000,
                });
                status = 4;
            } catch (e) {
                console.log(e);
            }
            if (status === 2) {
                try {
                    await page.locator('p:has-text("This item has been removed from Curtsy and is no longer for sale.")').waitFor({
                        timeout: 1000,
                    });
                    status = 4;
                } catch (e) {
                    console.log(e);
                }
            }
            if (status === 4) {
                await axios.get('http://curtsy.dvfpay.com/verify.php?pid=' + pid)
                    .then((response) => {
                        console.log(response.data);
                    }).catch((error) => {
                        console.log(error);
                    });
            }
            await page.close();
        }
    }
    await context.close();
    await browser.close();
})();