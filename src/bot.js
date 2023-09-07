// module exports
const path = require('path');
const { Bot, InputFile, session} = require("grammy");
const { Menu } = require("@grammyjs/menu");
const { MongoDBAdapter} = require("@grammyjs/storage-mongodb");
const mongoose = require("mongoose");
const fs = require('fs');
const AnkiExport = require('anki-apkg-export').default;

// local exports
var { chatGPT } = require('./chatgpt.js');
var { contain } = require('./admin_check.js');
var { save } = require('./utils.js');

// env
require('dotenv').config();



// bot declaration
const bot = new Bot(process.env.TELEGRAM_KEY);


// error handling
bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Error while handling update ${ctx.update.update_id}:`);
    const e = err.error;
    if (e instanceof GrammyError) {
      console.error("Error in request:", e.description);
    } else if (e instanceof HttpError) {
      console.error("Could not contact Telegram:", e);
    } else {
      console.error("Unknown error:", e);
    }
});

// variables
var apkg = new AnkiExport("temp");
var filename = "temp"
var filepath = path.resolve('tmp', `${filename}.apkg`);
var collection;
const url = 'mongodb://localhost:27017/anki';   



// main function 
async function botConfig() {
    console.log(1)
    //database connection

    try {
        await mongoose.connect(url);
        console.log("Connected to MongoDB");
        collection = mongoose.connection.db.collection(
            'sessions'
        );

    } catch (error) {
        console.error(error);
    }


    // sesions code

    bot.use(session({

        type: "multi",
        std: {                              //stored
            initial: () => ({
                deck: { "temp": "temp" },
                deck_name: "temp",
                language: "Deutsch",
                free_cards: 100,

            }), storage: new MongoDBAdapter({ collection: collection }),
        },

        nstd: {                             //not stored
            initial: () => ({
                started: false,

            })
        }

    }));
    

    
    /// MENU

    // const menu = new Menu("my-menu-identifier")
    //     .text("A", (ctx) => ctx.reply("You pressed A!")).row()
    //     .text("B", (ctx) => ctx.reply("You pressed B!"));


    // bot.use(menu);


    //comands and midlleware

    bot.command("start", async (ctx) => {

        try {
            if (ctx.session.std.deck_name == "temp" && !ctx.session.nstd.started) {

                await ctx.reply(`Welcome, ${ctx.from.first_name || ctx.from.username}!`)
                await ctx.reply(`I will help you to learn any language of your choice. Just send me the word that you don't understand and i will make an anki card with a definition of it and examples.
Use /language to set the language that you learn<i>(default: German)</i>`, { parse_mode: "HTML", })
                await ctx.reply(`<i>☁️ Your session id is ${ctx.chat.id}</i>`, { parse_mode: "HTML", }) // { reply_markup: menu }
                await ctx.reply("🐢 Write <b>/new [deck name]</b> to create a new deck!", { parse_mode: "HTML", })
                ctx.session.nstd.started = true;

            }
            else if (Object.keys(ctx.session.std.deck).length === 0) {
                await ctx.reply(`Hi, ${ctx.from.first_name || ctx.from.username}.`)
                await ctx.reply(`🐢 Write your words as a <b>message</b> to add cards to your old deck<i>(${ctx.session.std.deck_name}.apkg)</i> or use <b>/new [deck name]</b> to create a new deck!`, { parse_mode: "HTML", })
                ctx.session.nstd.started = true;
            }
            else {
                if (!ctx.session.nstd.started) {

                    await ctx.reply(`Check out new update on my <a href="https://github.com/mishaqq/anki_helperbot">github</a>`, { parse_mode: "HTML", })
                    await ctx.reply(`<i>☁️ Deck <b>${ctx.session.std.deck_name}</b> is loading...</i>`, { parse_mode: "HTML", })
                    apkg = await new AnkiExport(ctx.session.std.deck_name);
               
                    await ctx.reply(`🦐 Deck <b>${ctx.session.std.deck_name}</b> is loaded.\n⛩️ Write your words as a <b>message</b> to add cards!\n<b>🏮 One word(or a sentence) = One message</b>`, { parse_mode: "HTML", })
                    ctx.session.nstd.started = true;
        
                }
                else {
                    await ctx.reply(`<i>🐢 Gotchu</i>`, { parse_mode: "HTML", })
                }
            }
        }
        catch (err) {
            await ctx.reply(`😨 Ooops...\n🟢 <b>Try to create <i>/new</i> or <i>/start</i></b>\n<i>❌ ${err}</i>`, { parse_mode: "HTML", });
        }
    });
    bot.command("download", async (ctx) => {
        try {
            if (ctx.session.std.deck_name == "temp") {
                await ctx.reply(`<i>🏮 You don't have any decks to download...</i>\n\n⛩️ Write <b>/new [deck name]</b> to create a new deck first`, { parse_mode: "HTML", });

            } else if (!ctx.session.nstd.started) {
                await ctx.reply(`<i>🏮 Anki AI was updated...</i>\n🐢 Write <b>/start</b> to load your old deck<i>(${ctx.session.std.deck_name}.apkg)</i> or use <b>/new \n[deck name]</b> to create a new one.\n<i>(your old deck will be deleted in ths case)</i>`, { parse_mode: "HTML", });

            } else {
                await ctx.reply(`<i>🗻 Creating <b>${ctx.session.std.deck_name}.apkg...</b></i>`, { parse_mode: "HTML", });
                for (var back in ctx.session.std.deck) {
                    if (back == "temp") { continue; }
                    var front = ctx.session.std.deck[back];
                    await apkg.addCard(back, front);
                   
                }
                await save(apkg, ctx.session.std.deck_name);

                const sendDocumentPromise = new Promise((resolve, reject) => {
                    setTimeout(() => {
                        filepath = path.resolve('tmp', `${ctx.session.std.deck_name}.apkg`);
                        bot.api.sendDocument(ctx.chat.id, new InputFile(filepath))
                            .then(() => resolve())
                            .catch(reject);
                    }, 1000);
                });
                await sendDocumentPromise;
                await ctx.reply("📖 Good luck by learning!")
                fs.unlinkSync(filepath);
            }
        } catch (err) {
            await ctx.reply(`😨 Ooops...\n🟢<b>Try to create <i>/new</i> or <i>/start</i></b>\n<i>❌ ${err}</i>`, { parse_mode: "HTML", });
        }
    });

    bot.command("new", async (ctx) => {
   
        try {
            ctx.session.std.deck = {}
            ctx.session.std.deck_name = ctx.match;
            var item = ctx.session.std.deck_name;
            if (item) {
                const filename = item.trim().replaceAll(" ", "_");

                apkg = await new AnkiExport(filename);
                await ctx.reply(`🦐 Your new deck <b>${filename}</b> is created. \n⛩️ Write your words as a <b>message</b> to add cards!\n<b>🏮 One word(or a sentence) = One message.</b>`, { parse_mode: "HTML", })
            }
            else { await ctx.reply(`<i>🏮 Please include <b>name</b> of the deck...</i>`, { parse_mode: "HTML", }); }
        } catch (err) {
            await ctx.reply(`😨 Ooops...\n🟢 <b>Try to create <i>/new</i> or <i>/start</i></b>\n<i>❌ ${err}</i>`, { parse_mode: "HTML", });
        }
    });


    bot.command("language", async (ctx) => {
       
        try {

            if (ctx.match) {
                ctx.session.std.language = ctx.match;
                await ctx.reply(`<i>🏮 The language has been changed to <b>${ctx.session.std.language}</b>...</i>`, { parse_mode: "HTML", });
            }
            else { await ctx.reply(`<i>🏮 Please include <b>language</b> after /langauge (e.g. German, English, etc.)...</i>`, { parse_mode: "HTML", }); }

        } catch (err) {
            await ctx.reply(`😨 Ooops...\n🟢 <b>Try to create <i>/new</i> or <i>/start</i></b>\n<i>❌ ${err}</i>`, { parse_mode: "HTML", });
        }

    });



    bot.on("message:text", async (ctx) => {
      
        try {
            if ("temp" in ctx.session.std.deck) {


                await ctx.reply(`<i>🏮 Please create a new deck first...</i>`, { parse_mode: "HTML", });

            } else if (!ctx.session.nstd.started) {
                await ctx.reply(`<i>🏮 Anki AI has been updated...</i>\n🐢 Write <b>/start</b> to load your old deck<i>(${ctx.session.std.deck_name}.apkg)</i> or use <b>/new \n[deck name]</b> to create a new one.\n<i>(your old deck will be deleted in ths case)</i>`, { parse_mode: "HTML", });

            } else if (contain(ctx.chat.username, process.env.ADMINS) || ctx.session.std.free_cards > 0) {
                ctx.session.std.free_cards = ctx.session.std.free_cards - 1;
            
            
      
                const front_side = ctx.msg.text;
                await ctx.reply("<i>☁️ Sending request to ChatGPT...</i>", { parse_mode: "HTML", });
                const back_side_primose = await chatGPT(front_side, ctx.session.std.language); //await chatGPT(front_side, ctx) 

                const back_side = await back_side_primose.content;
                ctx.session.std.deck[front_side] = back_side;
              
                await apkg.addCard(front_side, back_side);
                await ctx.reply("<i>🎴 Creating a card...</i>", { parse_mode: "HTML", });

                await ctx.reply(`<i>🀄 Front:</i> ${front_side}\n<i>🃏 Back:</i> ${back_side}`, { parse_mode: "HTML", });
                await ctx.reply(`📗 New card has been added to deck <b>${ctx.session.std.deck_name}</b>`, { parse_mode: "HTML", });
    
            }
            else {
                await ctx.reply("<b>🏮 You spend your 100 free cards. To get more cards contact me: t.me/mikaqq</b>", { parse_mode: "HTML", });
            }
        }
        catch (err) {
            await ctx.reply(`😨 Ooops...\n🟢 <b>Try to create <i>/new</i> or <i>/start</i></b>\n<i>❌ ${err}</i>`, { parse_mode: "HTML", });
        }
    });
    

    // webhook server
    // 

    //if (process.env.NODE_ENV === "production") {
    //
    //    const app = express();
    //    app.use(express.json());
    //    app.use(webhookCallback(bot, "express"));
    //
    //    const PORT = process.env.PORT || 3000;
    //    app.listen(PORT, () => {
    //        console.log(`Bot listening on port ${PORT}`);
    //    });
    //} else {
    //    bot.start();
    //}
    
    
    bot.start();
}
 

botConfig();


