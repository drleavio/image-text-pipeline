const mongoose=require("mongoose");

const dbConnect=async()=>{
   try {
    await mongoose.connect("")
    console.log("db connected");
    
   } catch (error) {
    console.log("error connecting db",error);
   }
}

module.exports=dbConnect