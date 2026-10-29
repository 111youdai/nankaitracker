"use strict";
const express = require("express");
const cors = require("cors");
function createApp({ detailRequest = fetch } = {}) {
 const app = express();
 app.disable("x-powered-by"); app.use(cors());
 app.get("/", (req,res) => res.json({ok:true,service:"nankaitracker",version:"1.3.1"}));
 app.get("/logs.html", (req,res) => {
  const target = process.env.LOG_WORKER_URL || "https://nankai-tracker-logger.youdai-tracker.workers.dev";
  if (!target) return res.status(503).type("text").send("Cloudflareのログ画面は準備中です。LOG_WORKER_URLを設定してください。");
  try {
   const url = new URL(target);
   if (url.protocol !== "https:") throw Error();
   url.pathname = "/logs.html"; url.search=""; url.hash="";
   return res.redirect(302,url.href);
  } catch {return res.status(503).type("text").send("LOG_WORKER_URLの設定を確認してください。");}
 });
 app.get("/api/train", async (req,res) => {
  const n=String(req.query.train_number||""), kind=String(req.query.dia_kind||"2");
  if(!n||n.length>40||!["1","2"].includes(kind)) return res.status(400).json({error:"列番または路線が不正です"});
  const params=new URLSearchParams({train_number:n,dia_kind:kind,interface_no:String(req.query.interface_no||"1"),base_time:String(req.query.base_time||"00:00:00")});
  try {
   const r=await detailRequest("https://api-service.nankaiapp.com/api/v1/diagram/train?"+params,{signal:AbortSignal.timeout(25000)});
   return res.status(r.status).type("application/json").send(await r.text());
  } catch(e){return res.status(502).json({error:"列車詳細を取得できません"});}
 });
 return app;
}
if(require.main===module) createApp().listen(process.env.PORT||3000,()=>console.log("Nankai tracker API started"));
module.exports={createApp};
