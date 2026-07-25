'use strict';
const http=require('http'); const fs=require('fs'); const {build,OUTPUT}=require('./build-asset-gallery');
const result=build(); const server=http.createServer((req,res)=>{res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(fs.readFileSync(OUTPUT));});
server.listen(4179,'127.0.0.1',()=>console.log(JSON.stringify({url:'http://127.0.0.1:4179/',...result}))); 
