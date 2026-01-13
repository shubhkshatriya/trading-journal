import { useState } from 'react'
import useToDo from '../context/ToDoContext';

function ToDoForm() {
    const[todo, setTodoMsg] = useState("");

    const {addToDo} = useToDo();
    const add = (e) => {
        e.preventDefault();
        addToDo({todo, complete: false})
        setTodoMsg("");
    } 
  return (
    <form onSubmit={add}  className="flex">
    <input
        type="text"
        placeholder="Write Todo..."
        value={todo}
        onChange={(e) => setTodoMsg(e.target.value)}
        className="w-full border border-black/10 rounded-l-lg px-3 outline-none duration-150 bg-white/20 py-1.5"
    />
    <button type="submit" className="rounded-r-lg px-3 py-1 bg-green-600 text-white shrink-0">
        Add
    </button>
</form>
  )
}

export default ToDoForm
