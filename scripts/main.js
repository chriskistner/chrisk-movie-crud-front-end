const apiURLMovies = "http://localhost:3000/movies";
const apiURLActors = "http://localhost:3000/actors";
const axios = require('axios');
const create = require('./templates');

function getMovies() { axios.get(apiURLMovies) 
    .then(function (result) {
        let movies = result.data;
        populatePage(movies);
    })
};
getMovies();

function populatePage(arr){
    const appliedTemplates = arr.map(film => create.movieRow(film.id, film.title, film.released, film.director, film.rating, film.poster, film.actors)).join('\n');
    document.querySelector(".main-body").innerHTML = appliedTemplates;

    for (let film of arr){
        const appliedLists = film.actors.map(actor => create.createActorList(actor.first_name, actor.last_name)).join('\n');
        document.querySelector(`#actor-list[data-id="${film.id}"]`).innerHTML = appliedLists;
        console.log(appliedLists);
        let deleteBlogButton = document.querySelector(`#delete-film[data-id="${film.id}"]`);
        let updateBlogButton = document.querySelector(`#edit-film[data-id="${film.id}"]`);
        let closeUpdateButton = document.querySelector(`#stop-post[data-id="${film.id}"]`);
        let updateField = document.querySelector(`.update-field[data-id="${film.id}"]`);
        deleteBlogButton.addEventListener('click', function(){
            axios.delete(apiURLMovies+`/${film.id}`)
            .then(function(){
                console.log("Film Deleted")
                getMovies();
            })
        });

        updateBlogButton.addEventListener('click', function() {
            updateField.classList.remove('hide-menu')
        });

        closeUpdateButton.addEventListener('click', function(){
            updateField.classList.add('hide-menu')
        });

    }  
};