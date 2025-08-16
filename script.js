const addBtn = document.getElementById('addBtn');
const taskInput = document.getElementById('taskInput');
const taskList = document.getElementById('taskList');
const themeToggle = document.querySelector('.theme-toggle');

let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

function renderTasks() {
  taskList.innerHTML = '';
  tasks.forEach((task,index)=>{
    const li = document.createElement('li');
    li.className = task.completed?'completed':'';
    li.innerHTML = `
      <span>${task.text}</span>
      <div>
        <button class="toggleBtn"><i class="fas fa-check"></i></button>
        <button class="delBtn"><i class="fas fa-trash-alt"></i></button>
      </div>
    `;

    li.querySelector('.toggleBtn').addEventListener('click', ()=>{
      tasks[index].completed = !tasks[index].completed;
      saveAndRender();
    });

    li.querySelector('.delBtn').addEventListener('click', ()=>{
      tasks.splice(index,1);
      saveAndRender();
    });

    taskList.appendChild(li);
  });
}

function saveAndRender(){
  localStorage.setItem('tasks', JSON.stringify(tasks));
  renderTasks();
}

addBtn.addEventListener('click', ()=>{
  const taskText = taskInput.value.trim();
  if(taskText!==''){
    tasks.push({text: taskText, completed:false});
    taskInput.value='';
    saveAndRender();
  }
});

taskInput.addEventListener('keypress',(e)=>{
  if(e.key==="Enter") addBtn.click();
});

themeToggle.addEventListener('click',()=>{
  document.body.classList.toggle('light');
});

renderTasks();
