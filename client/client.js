const noteListDiv = document.getElementById("note-list-div");
const newNoteBtn = document.getElementById("new-note-btn");
const delNoteBtn = document.getElementById("del-note-btn");
const activeNoteSpan = document.getElementById("active-note-div");

const noteMap = new Map();

let activeNote = null;


class Note {
  constructor(title, content) {
    this.title = title;
    this.content = content;
  }
}


function selectNote(title) {
  activeNote = title;
  
  regenUI();
}

function regenUINoteList() {
  noteListDiv.innerHTML = "";
  for(const [title, content] of noteMap) {
    const btn = document.createElement("button");
    
    if(activeNote === title) btn.style = "font-weight: bold;";
    
    btn.textContent = title;
    btn.onclick = function() {
      selectNote(title);
    }
    noteListDiv.appendChild(btn);
  }
}

function regenUIActiveNote() {
  if(activeNote === null) {
    activeNoteSpan.innerHTML = "no note selected";
    activeNoteSpan.contentEditable = false;
  } else {
    if(noteMap.get(activeNote) === null || noteMap.get(activeNote) === "") noteMap.set(activeNote, "your note...");

    activeNoteSpan.innerHTML = noteMap.get(activeNote);
    activeNoteSpan.contentEditable = true;
    activeNoteSpan.oninput = function() {
      if(activeNote !== null) noteMap.set(activeNote, activeNoteSpan.innerHTML);
    }
  }
}

function regenUI() {
  regenUINoteList();
  regenUIActiveNote();
}

function addNewNote(title, content) {
  noteMap.set(title, content);
  activeNote = title;
  
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
  activeNote = tmpNoteBeforeActive;

  regenUI();
}


newNoteBtn.onclick = function() {
  let title = prompt("Enter the title of the new note", "");
  if(title === null || title.trim() === "") return;
  
  while(noteMap.has(title)) {
    title += "-1";
  }
  addNewNote(title, "");
};

delNoteBtn.onclick = function() {
  if(activeNote === null) return;
  
  if(confirm(`Delete note "${activeNote}"?`)) {
    removeActiveNote();
  }
}
