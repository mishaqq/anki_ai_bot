
module.exports = { contain }
// to add admins in .env variables
function contain(a, obj) {
    var admin = "";
    for (var i = 0; i < obj.length; i++) {
           
        admin += obj[i];
       
        if (obj[i] == '|') {

            if (admin == a && (obj[i + 1] == "|" || i + 1 == obj.length)) {
                
                return true;
            }
            else {
                admin = "";
            }
    
            
            
        }

        if (admin == a && (obj[i + 1] == "|" || i + 1 == obj.length)) {
            return true;
        }

       
   
    }
    return false;
}