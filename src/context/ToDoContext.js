/* eslint-disable no-unused-vars */
import { createContext, useContext } from "react";


export const ToDoContext = createContext({
    todos: [{
        id: 1,
        todo:"Hellow",
        complete: false
    }],

    addToDo:(todo) => {},
    updateToDo:(id, todo) => {},
    deleteToDo:(id) => {},
    toggleToDo:(id) => {}
})


export const ToDoProvider = ToDoContext.Provider;

export default function useToDo() {
    return useContext(ToDoContext);
}





