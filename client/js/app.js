const noteListDiv = document.getElementById("note-list-div");
const newNoteBtn = document.getElementById("new-note-btn");
const delNoteBtn = document.getElementById("del-note-btn");
const activeNoteDiv = document.getElementById("active-note-div");
const thisUrl = window.location.origin + window.location.pathname.replace(/\/+$/, "") + "/";
const noteUrlPart = "notes/";
//console.log(thisUrl)
const noteMap = new Map();
const lastNoteActivityAutosaveInterval = 5000; //ms

let activeNote = null;
let activeNoteInteracted = false;
let activeNoteSaved = false;
let activeNoteInteractTime = 0;
let activeNoteSaveTime = 0;


class Note {
  constructor(title, content) {
    this.title = title;
    this.content = content;
  }
}


async function saveActiveNoteToServer() {
  if(activeNote === null) return;

  try {
    const response = await fetch(thisUrl + noteUrlPart, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: activeNote,
        content: noteMap.get(activeNote)
      })
    });

    if(!response.ok) {
      console.error(`Response status: ${response.status}`);
    } else {
      activeNoteSaved = true;
      activeNoteSaveTime = Date.now();
    }
  } catch(err) {
    console.error(err);
  }
}

function setActiveNote(title) {
  activeNote = title;
  //activeNoteInteracted = false;
  // possibility of last active note to not have been saved, could be solved by having a "save list"
}

async function selectNote(title) {  
  if(activeNoteInteracted) {
    if(!activeNoteSaved) {
      await saveActiveNoteToServer();
    }
  }

  if(activeNote !== title) {
    setActiveNote(title);
  
    regenUI();
  }
}

function regenUINoteList() {
  noteListDiv.innerHTML = "";
  for(const [title, content] of noteMap) {
    const btn = document.createElement("button");
    
    if(activeNote === title) btn.style = "font-weight: bold;";
    
    btn.textContent = title;
    btn.onclick = async function() {
      await selectNote(title);
    }
    noteListDiv.appendChild(btn);
  }
}

function regenUIActiveNote() {
  if(activeNote === null) {
    activeNoteDiv.innerHTML = "no note selected";
    activeNoteDiv.contentEditable = false;
  } else {
    if(noteMap.get(activeNote) === null || noteMap.get(activeNote) === "") noteMap.set(activeNote, "your note...");

    activeNoteDiv.innerHTML = noteMap.get(activeNote);
    activeNoteDiv.contentEditable = true;
    activeNoteDiv.oninput = function() {
      if(activeNote !== null) {
        noteMap.set(activeNote, activeNoteDiv.innerHTML);
        activeNoteInteracted = true;
        activeNoteSaved = false;
        activeNoteInteractTime = Date.now();
      }
    }
  }
}

function regenUI() {
  regenUINoteList();
  regenUIActiveNote();
}

async function addNewNote(title, content) {
  if(noteMap.has(title)) return;
  
  if(activeNoteInteracted) {
    if(!activeNoteSaved) {
      await saveActiveNoteToServer();
    }
  }

  noteMap.set(title, content);
  setActiveNote(title);
  
  await saveActiveNoteToServer();

  regenUI();
}

function removeActiveNote() { 
  // get the note before the one being currently deleted and select it after deletion
  let tmpActiveNote = null;
  let tmpNoteBeforeActive = null;
  for(const [title, content] of noteMap) {
    tmpNoteBeforeActive = tmpActiveNote;
    tmpActiveNote = title;
      
    if(tmpActiveNote === activeNote) break;
  }
  
  noteMap.delete(activeNote);
  setActiveNote(tmpNoteBeforeActive);

  regenUI();
}


newNoteBtn.onclick = async function() {
  let title = prompt("Enter the title of the new note", "");
  if(title === null || title.trim() === "") return;
  
  while(noteMap.has(title)) {
    title += "-1";
  }

  await addNewNote(title, "");
};

delNoteBtn.onclick = function() {
  if(activeNote === null) return;
  
  if(confirm(`Delete note "${activeNote}"?`)) {
    removeActiveNote();
  }
}
