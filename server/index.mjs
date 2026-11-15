import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";


const PROGRAM_ROOT_DIR = import.meta.dirname;
const CLIENT_DIR = path.resolve(PROGRAM_ROOT_DIR, "../client");
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};


http
  .createServer(async (request, response) => {
    if(request.method === "GET" || request.method === "POST") {
      const { headers, method, url } = request;
      let body = [];
      request
        .on("error", err => {
          console.error(err);
        })
        .on("data", chunk => {
          body.push(chunk);
        })
        .on("end", async () => {
          body = Buffer.concat(body).toString();

          response.on("error", err => {
            console.error(err);
          });
          
          if(method === "GET") {
            let filePath = path.join(CLIENT_DIR, url);
            if(!filePath.startsWith(path.resolve(CLIENT_DIR) + path.sep)) {
              response.statusCode = 404;
              response.end();
              return;
            } else {
              // implement custom dynamic serving here
              
              // static
              try {
                await serveStaticFile(response, filePath);
              } catch(err) {
                console.error(err);
                response.statusCode = 500;
                response.end("Internal Server Error");
              }
            }
          } else {
            response.statusCode = 404;
            response.end();
            return;
          }
      });
    } else {
      response.statusCode = 404;
      response.end();
      return;
    }
  })
  .listen(8080);


async function serveStaticFile(response, filePath) {
  if(path.resolve(filePath) === path.resolve(CLIENT_DIR)) {
    filePath = path.resolve(filePath) + path.sep + "index.html";
  }

  try {
    const content = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    response.statusCode = 200;
    response.setHeader("Content-Type", contentType);
    response.end(content);
  } catch(err) {
    if(err.code === "ENOENT" || err.code === "EISDIR") {
      response.statusCode = 404;
      response.end();
      return;
    } else {
      throw err;
    }
  }
}
