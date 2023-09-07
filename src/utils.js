module.exports = { save }
const fs = require('fs');


async function save(ankiObjekt, filename) {
    ankiObjekt
        .save()
        .then(zip => {
            fs.writeFileSync(`./tmp/${filename}.apkg`, zip, 'binary');
            console.log(`Package has been generated: ${filename}.pkg`);
        })
        .catch(err => console.log(err.stack || err));
}