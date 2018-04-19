const puppeteer = require('puppeteer');
const ora = require('ora');
const chalk = require('chalk');
const fs = require('fs');

const config = require('./config.js');

const browser = puppeteer.launch({
	//false是打开GUI界面
    headless: false
}).then(async browser => {

    let page = await browser.newPage();

    await page.goto('http://pub.alimama.com');
    //等待iframe加载完成
    await page.waitForSelector('iframe').then(() => console.log(chalk.green('iframe加载完成。')));
    await page.waitFor('iframe[name="taobaoLoginIfr"]');
    await page.waitFor(2000);
    let iframe = await page.frames().find(f => f.name() === 'taobaoLoginIfr');
    //延时2秒钟
    
    await executeFrame(page ,iframe);

    await page.type('#q' , config.SEARCHTEXT);


    const searchBtn = await page.$('.header .search-btn');

    await searchBtn.click();

    await page.waitFor('.lists-top-filter-tag');

    const coupons = await page.$$('.lists-top-filter-tag');
    
    await coupons.forEach((item ,index)=>{
    	if(index == 2){
    		item.click();
    	}
    });
    await page.waitFor(2000);
    


    let sg = await page.$eval('.box-btn-left' , async ele => {
    	ele.click();
    });
	

    return false;

    //
    let getContentOra = ora('开始查找数据...');
    getContentOra.start();

	const results = await page.$$eval('.search-result-wrap .block-search-box' , async elements => {
		
		let res = await elements.map(item =>{
			let $box = $(item);

			let res = $box.find('.tags-container');
			return {
				//商品名称
				title: $box.find('.content-title').html().replace(/<\/?[^>]*>/g,''),
				//商品金额
				integer: $box.find('.color-d.number').html().replace(/<\/?[^>]*>/g,'').replace('￥' ,''),
				//优惠金额
				preferential: res.find('.money span').text(),
				//优惠剩余
				remaining: res.find('.valign-m span').text(),
				//商店名称
				shops: $box.find('.shop-hd').html().replace(/<\/?[^>]*>/g,''),
				//商品图片地址
				imgurl: $box.find('img').attr('src'),
				//商品地址
				shopurl: $box.find('a.img-loaded').attr('href')
			};
		});
		
		return res;
	});
	getContentOra.stop();

	let writerStream = fs.createWriteStream('alimama.json');

	writerStream.write(JSON.stringify(results), 'UTF8');

	writerStream.end();
	console.log(chalk.green('文件写入成功， 关闭窗口'));

    //browser.close();
});


function isLoadingFinished(page) {
    return page.evaluate(() => {
        // document.readyState: loading 加载；
        //interactive / 互动；complete / 完成
        return document.readyState === 'complete';
    })
}

async function executeFrame(page ,iframe){
	if (await isLoadingFinished(iframe)){
		//获取显示密码登录按钮
	    const showLoninBtn = await iframe.$('#J_Quick2Static');
	    await showLoninBtn.click();


	    await iframe.type('#TPL_username_1', config.USERNAME);
	    await iframe.type('#TPL_password_1', config.PASSWORD);

	    await page.waitFor(1000);
	    const submitBtn = await iframe.$('#J_SubmitStatic');
	    await submitBtn.click();


	    // await page.waitFor(20000);
	} else {
	    await page.waitFor(200);
	    await executeFrame(page ,iframe);
  	}
}