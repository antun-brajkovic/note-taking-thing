import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";


const PROGRAM_ROOT_DIR = import.meta.dirname;
const CLIENT_DIR = path.resolve(PROGRAM_ROOT_DIR, "../client");
const USER_DATA_DIR = path.resolve(PROGRAM_ROOT_DIR, "../user-data");
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};
const NOTES_URL_SEG = "/notes";
const NOTES_META_FILE = "notes.json";

let notes = [];


async function initServer() {
  await loadNotes();
}


await initServer();

http
  .createServer(async (request, response) => {
    if(request.method === "GET" || request.method === "POST" || request.method === "DELETE") {
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
              // conditional custom dynamic serving
              if(url.startsWith(NOTES_URL_SEG)) {
                try {
                  await serveNotes(response);
                } catch(err) {
                  console.error(err);
                  response.statusCode = 500;
                  response.end("Internal Server Error");
                }

                return;
              }
              
              // static serving
              try {
                await serveStaticFile(response, filePath);
              } catch(err) {
                console.error(err);
                response.statusCode = 500;
                response.end("Internal Server Error");
              }
            }
          } else if(method === "POST") {
            console.log(`POST: \nurl: ${url}\ncontent: ${body}`);
            
            if(url.startsWith(NOTES_URL_SEG)) {
              console.log("someone's tryna put some notes here oi!");
              const content = JSON.parse(body);
              console.log(content);
              const ind = getNoteInd(content.title);
              if(ind !== false) {
                notes[ind].content = content.content;
                notes[ind].saved = false;
              } else {
                notes.push({
                  title: content.title,
                  content: content.content,
                  saved: false
                });
              }
              console.log(`notes:\n${notes}`);
              await saveNotes();

              response.statusCode = 200;
              response.end();
              return;
            } else {
              response.statusCode = 500;
              response.end();
              return;
            }
          } else if(method === "DELETE") {
            console.log(`DELETE: title: ${headers["note-title"]}`);

            if(url.startsWith(NOTES_URL_SEG)) {
              console.log("deletenzi bitte :pray:");
              if(await removeNote(headers["note-title"])) {
                await saveNotes();
              
                response.statusCode = 204;
                response.end();
                return;
              } else {
                response.statusCode = 500;
                response.end();
              }
            } else {
              response.statusCode = 500;
              response.end();
              return;
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


async function serveNotes(response) {
  let retVal = [];

  for(let i = 0; i < notes.length; i++) { // maybe separate the note data so that you can directly serve it without parsing and have other data the server uses be in a separate array? but that might only be a performance improvement...
    retVal.push({
      title: notes[i].title,
      content: notes[i].content
    });
  }

  response.statusCode = 200;
  response.end(JSON.stringify(retVal));
}

async function loadNotes() {
  const metaText = await readTextFile(path.join(USER_DATA_DIR, NOTES_META_FILE));

  if(metaText !== null) {
    const meta = JSON.parse(metaText);

    for(let i = 0; i < meta.length; i++) {
      const textFileCont = await readTextFile(path.join(USER_DATA_DIR, meta[i].fileName));
      notes.push({
        title: meta[i].title,
        content: (textFileCont !== null) ? textFileCont : "",
        saved: true
      });
    }
  }
}

async function removeNote(title) {
  const ind = getNoteInd(title);

  if(ind === false) return false;

  await deleteFile(path.join(USER_DATA_DIR, hashString(notes[ind].title) + ".txt"));
  notes.splice(ind, 1);
  return true;
}

async function saveNotes() { // maybe make saving atomic on a per-note basis?
  const meta = genMeta();

  await writeTextFile(path.join(USER_DATA_DIR, NOTES_META_FILE), JSON.stringify(meta));

  for(let i = 0; i < notes.length; i++) {
    if(notes[i].saved === false) {
      await writeTextFile(path.join(USER_DATA_DIR, meta[i].fileName), notes[i].content);

      notes[i].saved = true;
    }
  }
}

function genMeta() {
  let meta = [];

  for(let i = 0; i < notes.length; i++) {
    meta.push({
      title: notes[i].title,
      fileName: hashString(notes[i].title) + ".txt"
    });
  }

  return meta;
}

function hashString(str) { //FNV-1a 32-bit
  let hash = 0x811c9dc5;

  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

function getNoteInd(title) {
  for(let i = 0; i < notes.length; i++) {
    if(notes[i].title === title) {
      return i;
    }
  }

  return false;
}

async function writeTextFile(filePath, content) {
  await fs.writeFile(filePath, content, "utf-8");
  console.log(`written file: ${filePath}\ncontent: \n${content}`);
}

async function readTextFile(filePath) {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return content;
  } catch(err) {
    if(err.code === "ENOENT") {
      return null;
    }
    throw err; // re-throw unexpected errors
  }
}

async function deleteFile(filePath) {
  await fs.rm(filePath, { force: true });
}

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
