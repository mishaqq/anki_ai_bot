// import { Bot } from "grammy";
// import fs from 'fs';
// import path from 'path';
// //import { AnkiExport } from 'anki-apkg-export';
// import AnkiExport from 'anki-apkg-export';
// import dotenv from 'dotenv'
// dotenv.config()
const path = require('path');
const { Bot, InputFile, Context, session, SessionFlavor } = require("grammy");
const { Menu } = require("@grammyjs/menu");
const { freeStorage } = require("@grammyjs/storage-free");
const { parse, stringify } = require('flatted');

const fs = require('fs');
const AnkiExport = require('anki-apkg-export').default;
var { chatGPT } = require('./chatgpt.js');
require('dotenv').config();




const bot = new Bot(process.env.TELEGRAM_KEY); // <-- put your bot token between the "" (https://t.me/BotFather)

// sesions code


bot.use(session({
    initial: () => ({
        deck: { "temp": "temp" },
        deck_name: "temp",
    }), storage: freeStorage(bot.token),
}));

// variables
var apkg;
var filename = "temp"
var filepath = path.resolve('tmp', `${filename}.apkg`);
const menu = new Menu("my-menu-identifier")
    .text("A", (ctx) => ctx.reply("You pressed A!")).row()
    .text("B", (ctx) => ctx.reply("You pressed B!"));

// manu.
bot.use(menu);

//comands
bot.command("start", async (ctx) => {
    ctx.session.deck = {}

    try {
        await ctx.reply(`Welcome, ${ctx.from.first_name || ctx.from.username}!`)
        await ctx.reply(`Your session id is ${ctx.chat.id}!`) // { reply_markup: menu }
    }
    catch (err) {
        await ctx.reply(`😨 Ooops...\n🟢 <b>Try to <i>/restart</i></b>\n<i>❌ ${err}</i>`, { parse_mode: "HTML", });
    }

    //const text = await chatGPT();
    // await ctx.reply(`GPTChat Message: ${text.content}`)

    //apkg = await new AnkiExport('test_deck');


});


bot.command("restart", async (ctx) => {




    //const text = await chatGPT();
    // await ctx.reply(`GPTChat Message: ${text.content}`)


    try {
        for (var card in ctx.session.deck) {
            var value = ctx.session.deck[card];
            await ctx.reply(`${card} : ${value}`)

            // do something with "key" and "value" variables
        }

        await ctx.reply(`<i>📡 Restarting...</i>`, { parse_mode: "HTML", });


        apkg = await new AnkiExport(ctx.session.deck_name);
        await ctx.reply("🟢 Done.\n\nWrite <b>/new [deck name]</b> to create a new deck.")

    } catch (err) {
        await ctx.reply(`😨 Ooops...\n🟢 <b>Try to <i>/restart</i></b>\n<i>❌ ${err}</i>`, { parse_mode: "HTML", });
    }
});

bot.command("download", async (ctx) => {

    try {
        await ctx.reply(`<i>🗻 Creating ${apkg}.apkg...</i>`, { parse_mode: "HTML", });
        await save(apkg, ctx.session.deck_name);

        const sendDocumentPromise = new Promise((resolve, reject) => {
            setTimeout(() => {
                filepath = path.resolve('tmp', `${ctx.session.deck_name}.apkg`);
                bot.api.sendDocument(ctx.chat.id, new InputFile(filepath))
                    .then(() => resolve())
                    .catch(reject);
            }, 1000);
        });

        // Wait for the sendDocumentPromise to resolve before replying
        await sendDocumentPromise;


        await ctx.reply("📖 Good luck by learning!")
        fs.unlinkSync(filepath);
    } catch (err) {
        await ctx.reply(`😨 Ooops...\n🟢 <b>Try to <i>/restart</i></b>\n<i>❌ ${err}</i>`, { parse_mode: "HTML", });
    }



});

bot.command("new", async (ctx) => {
    // `item` will be "apple pie" if a user sends "/add apple pie".
    try {
        ctx.session.deck_name = ctx.match;
        var item = ctx.session.deck_name;
        if (item) {
            const filename = item.trim().replaceAll(" ", "_");

            apkg = await new AnkiExport(filename);
            await ctx.reply(`🦐 Your new deck <b>⛩️ ${filename}</b> is created. \nWrite your words as a message to add cards!\n<b>🏮 One word(or a sentence) = One message</b>`, { parse_mode: "HTML", })
        }
        else { await ctx.reply(`<i>🏮 Please include <b>name</b> of the deck...</i>`, { parse_mode: "HTML", }); }
    } catch (err) {
        await ctx.reply(`😨 Ooops...\n🟢 <b>Try to <i>/restart</i></b>\n<i>❌ ${err}</i>`, { parse_mode: "HTML", });
    }




});



bot.on("message:text", async (ctx) => {
    // Text is always defined because this handler is called when a text message is received.
    try {

        const front_side = ctx.msg.text;
        await ctx.reply("<i>☁️ Sending request to ChatGPT...</i>", { parse_mode: "HTML", });
        const back_side_primose = "test text"; //await chatGPT(front_side)

        const back_side = back_side_primose; //await back_side_primose.content
        ctx.session.deck[front_side] = back_side;
        // await ctx.reply(`GPTChat Message: ${text.content}`)

        await apkg.addCard(front_side, back_side);


        //await ctx.session.deck.save();
        await ctx.reply("<i>🎴 Creating a card...</i>", { parse_mode: "HTML", });

        await ctx.reply(`<i>🀄 Front:</i> ${front_side}\n<i>🃏 Back:</i> ${back_side}`, { parse_mode: "HTML", });
        await ctx.reply("🟢 Done.")

        //await ctx.replyWithDocument('./output.apkg');
        //bot.api.sendDocument(ctx.chat.id, new InputFile("./output.apkg"))
        //new fs.InputFile("./output.apkg");
    }
    catch (err) {
        await ctx.reply(`😨 Ooops...\n🟢 <b>Try to <i>/restart</i></b>\n<i>❌ ${err}</i>`, { parse_mode: "HTML", });
    }

});
// Reply to any message with "Hi there!".
// bot.on("message", (ctx) => {

//     ctx.reply("Hi there!")

// });

bot.start();


//const filepath = path.resolve('tmp', 'test.txt');
//const content = 'Som!';



// fs.writeFile(filepath, content, { flag: 'a+' }, err => {
//     if (err) {
//         console.error(err.message);
//     }
//     // file written successfully
// });

// const apkg = new AnkiExport('deck-name');



// apkg.addCard('card #1 front', 'card #1 back');
// apkg.addCard('card #2 front', 'card #2 back', { tags: ['nice', 'better card'] });



async function save(ankiObjekt, filename) {
    ankiObjekt
        .save()
        .then(zip => {
            fs.writeFileSync(`./tmp/${filename}.apkg`, zip, 'binary');
            console.log(`Package has been generated: ${filename}.pkg`);
        })
        .catch(err => console.log(err.stack || err));

}
