const apiURLMovies = "http://localhost:3000/movies";
const apiURLActors = "http://localhost:3000/actors";
const axios = require('axios');
const create = require('./templates');

//ALL MOVIES PAGE
function getMovies() { axios.get(apiURLMovies) 
    .then(function (result) {
        let movies = result.data;
        populateMovies(movies);
    })
};

function populateMovies(arr){
    const appliedTemplates = arr.map(film => create.movieRow(film.id, film.title, film.released, film.director, film.rating, film.poster, film.actors)).join('\n');
    document.querySelector(".main-body").innerHTML = appliedTemplates;

    const starElement = `<img style="margin-top: -3px;" src="http://pngimg.com/uploads/star/star_PNG41472.png" height="20" width="20">`
    
    for (let film of arr){
        const appliedLists = film.actors.map(actor => create.createActorList(actor.first_name, actor.last_name)).join('\n');
        
        if (appliedLists.length === 0) {
            document.querySelector(`#actor-list[data-id="${film.id}"]`).innerHTML = "<li><i>NO ACTORS LISTED</i></li>";
        } else {document.querySelector(`#actor-list[data-id="${film.id}"]`).innerHTML = appliedLists};

        const starRating = 'Rating: ' + starElement.repeat(film.rating);
        console.log(starRating);
        document.querySelector(`#star-rating[data-id="${film.id}"]`).innerHTML = starRating;

        // MOVIE ROW MENU BUTTONS
        let deleteFilmButton = document.querySelector(`#delete-film[data-id="${film.id}"]`);
        let updateFilmButton = document.querySelector(`#edit-film[data-id="${film.id}"]`);

        // UPDATE FIELD AREA
        let closeUpdateButton = document.querySelector(`#stop-post[data-id="${film.id}"]`);
        let updateField = document.querySelector(`.update-field[data-id="${film.id}"]`);
        let updateFieldPoster = document.querySelector(`#update-poster[data-id="${film.id}"]`);
        let updateFieldTitle = document.querySelector(`#update-title[data-id="${film.id}"]`);
        let updateFieldReleased = document.querySelector(`#update-released[data-id="${film.id}"]`);
        let updateFieldDirector = document.querySelector(`#update-director[data-id="${film.id}"]`);
        let updateFieldRating = document.querySelector(`#update-rating[data-id="${film.id}"]`);
        let submitUpdate = document.querySelector(`.update-form[data-id="${film.id}"]`);

        deleteFilmButton.addEventListener('click', function(){
            axios.delete(apiURLMovies+`/${film.id}`)
            .then(function(){
                console.log("Film Deleted")
                getMovies();
            })
        });

        updateFilmButton.addEventListener('click', function() {
            if(updateField.classList.contains('hide-menu')) {
                updateField.classList.remove('hide-menu')
            } else {updateField.classList.add('hide-menu')}
        });

        closeUpdateButton.addEventListener('click', function(){
            updateField.classList.add('hide-menu')
        });

        submitUpdate.addEventListener('submit', function(){
            event.preventDefault();
            const updateMovie = axios.put(apiURLMovies+`/${film.id}`, {
                poster: updateFieldPoster.value,
                title: updateFieldTitle.value,
                released: updateFieldReleased.value,
                director: updateFieldDirector.value,
                rating: updateFieldRating.value,
            })
            .then(function(){
                console.log('Updated');
                getMovies();
                updateField.classList.add('hide-menu');
            })
        })

    }  
};

//ADD MOVIE PAGE
function populateAddMovie () {
    document.querySelector(".main-body").innerHTML = create.newMovie();

    let addNewMovie= document.querySelector(`#submit-movie`);
    let newMovieLink= document.querySelector(`#filmPoster`);
    let newMovieTitle= document.querySelector(`#filmTitle`);
    let newMovieRelease= document.querySelector(`#filmRelease`);
    let newMovieDirector= document.querySelector(`#filmDirector`);
    let newMovieRating= document.querySelector(`#filmRating`);

    addNewMovie.addEventListener('submit', function() {
        event.preventDefault();
        const addMovie = axios.post(apiURLMovies, {
            poster : newMovieLink.value,
            title: newMovieTitle.value,
            released: newMovieRelease.value,
            director: newMovieDirector.value,
            rating: newMovieRating.value
        })
        .then(function(){
            console.log("Success")
            console.log(newMovieLink.value);
            document.querySelector(".main-body").innerHTML = create.displayNewMovie(newMovieTitle.value, newMovieLink.value, newMovieRelease.value, newMovieDirector.value, newMovieRating.value) 
        })
    })

}

// let searchForFilm = document.querySelector('#movie-search');

function getMovie(film) {
    axios.get(apiURLMovies + `/${film}`)
        .then(function (result) {
            let film = result.data[0];
            populateMovies([film]);
        })
}

// searchForFilm.addEventListener('submit', function(event){
//     event.preventDefault();
//     let targetMovie = event.target.searchField.value;
//     getMovie(targetMovie);
//     event.target.searchField.value = '';
// })

// ALL ACTORS PAGE

function getActors() { axios.get(apiURLActors) 
    .then(function (result) {
        let stars = result.data;
        console.log(stars);
        populateActors(stars);
    })
};

function populateActors(arr) {
    const appliedTemplates = arr.map(star => create.actorRow(star.id, star.first_name, star.last_name)).join('\n');
    document.querySelector(".main-body").innerHTML = appliedTemplates;

    for (let stars of arr){
        const appliedLists = stars.films.map(film => create.createMovieList(film.title)).join('\n');
        
        if (appliedLists.length === 0) {
            document.querySelector(`#movie-list[data-id="${stars.id}"]`).innerHTML = "<li><i>NO ACTORS LISTED</i></li>";
        } else {document.querySelector(`#movie-list[data-id="${stars.id}"]`).innerHTML = appliedLists}
    }
} 

function populateAddActorPage() {
    document.querySelector(".main-body").innerHTML = create.newActor();
    axios.get(apiURLMovies)
    .then(function(result){
        let titles = result.data;
        create.populateDropdown(titles);
    })
    let addNewActor = document.querySelector('#add-actor');
    let newActorFName = document.querySelector('#actor-first-name');
    let newActorLName = document.querySelector('#actor-last-name');
    // dropdown.size = dropdown.length;

    addNewActor.addEventListener('submit', function (event){
        event.preventDefault();
        let movieList = Array.from(document.querySelectorAll('#film-options option:checked')).map(element => element.getAttribute('data-id')).filter(element => element);
       axios.post(apiURLActors, {
            first_name: newActorFName.value,
            last_name: newActorLName.value,
        })
        .then(function(result){
            console.log(result)
            axios.post(apiURLActors +`/${result.data.id}/movies`, {
                movies: movieList,
            })
        })
    })
}

if (window.location.href.endsWith('/index.html')){
    getMovies();
} else if (window.location.href.endsWith('/add-movie.html')) {
    populateAddMovie();
} else if (window.location.href.endsWith('/actors.html')) {
    getActors();
} else if (window.location.href.endsWith('/add-actor.html')) {
    populateAddActorPage();
}