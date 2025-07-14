import express from "express"
const router=express.Router();


router.get("/signup",async(req,res)=>{
    return res.send({msg:"hello"})
})

export default router