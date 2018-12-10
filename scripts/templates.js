const movieRow = (id, title, released, director, rating, poster) => {
    return `
    <div class="row justify-content-center item-rows">
        <div class="col-2 border-top border-left border-bottom border-success item-columns">
            <img src="${poster}" height="200px" width="135px">
        </div>

        <div class="col-2 border-top border-bottom border-success item-columns">
            <p><b>Site ID:</b> ${id}</p>
            <p><b>Title:</b> ${title}</p>
            <p><b>Released:</b> ${released}</p>
            <p id="star-rating" data-id="${id}"></p>
        </div>

        <div class="col-2 border-top border-bottom border-success item-columns">
            <p style="margin-bottom: 0px;"><b>Actors:</b><ul id="actor-list" data-id=${id}> </ul></p>
        </div>
            <div class="col-2 border-top border-right border-bottom border-success item-columns">
                    <button id="edit-film" data-id="${id}" type="button" class="btn btn-block btn-outline-danger">Update</button>
                    <button id="delete-film" data-id="${id}" type="button" class="btn btn-block btn-outline-warning">Delete</button>
            </div>
        </div>
    <div class="row update-field hide-menu justify-content-center" data-id="${id}">
        <form class="update-form" data-id="${id}">
            <div class="form-row justify-content-center">
                <div class="col-2 border-top border-left border-bottom item-columns">
                    <input class="update-form-fields" type="text" data-id="${id}"  id="update-poster" value="${poster}">
                </div>
                <div class="col-2 border-top border-bottom item-columns">
                    <input class="update-form-fields" type="text" data-id="${id}"  id="update-title" value="${title}">
                    <input class="update-form-fields" type="text" data-id="${id}"  id="update-released" value="${released}">
                </div>
                <div class="col-2 border-top border-bottom item-columns">
                <input class="update-form-fields" type="text" data-id="${id}"  id="update-director" value="${director}">
                <input class="update-form-fields" type="text" data-id="${id}"  id="update-rating" value="${rating}">
            </div>
                <div class="col-2 border-top border-right border-bottom item-columns">
                    <button id = "stop-post" data-id="${id}" type="button" class="close-button btn-sm btn-outline-dark">X</button>
                    <input type="submit" class="update-button btn-info" id="submit-update" data-id="${id}" value="Update Movie">
                </div>
            </div>
        </form>
    </div>
    `
};

const createActorList = (fName, lName) => {
    return `
    <li>${fName} ${lName}</li>
    `
};

const newMovie = () => {
    return `
        <div class="row justify-content-center item-rows">
            <div class="col-4 border item-columns">
                <div class="form-group">
                <form id="submit-movie">
                    <div class="row align-items-center justify-content-between">
                        <div class="col">
                            <h2>Movie Information</h2>
                        </div>
                    </div>
                <div class="row justify-content-center">
                    <div class="col-sm item-columns">
                        <img class="input-fieldE sample-poster" src="https://via.placeholder.com/150" alt="poster">
                    </div>
                </div>

                <div class="menuBar">
                    <label class="menuBar" for="filmPoster">Movie Poster <i>link Only</i></label>
                </div>
                    <input class="input-fieldE" type="text" id="filmPoster">
                <div class="menuBar">
                    <label class="menuBar" for="filmTitle">Movie Title</label>
                </div>
                    <input class="input-fieldA" type="text" id="filmTitle">

                <div class="menuBar">
                    <label class="menuBar" for="filmRelease">Year Released</label>
                </div>
                    <input class="input-fieldB" type="text" id="filmRelease">

                <div class="menuBar">
                    <label class="menuBar" for="filmDirector">Director</label>
                </div>
                <input class="input-fieldC" type="text" id="filmDirector">

                <div class="menuBar">
                    <label class="menuBar" for="filmRating">Star Rating</label>
                </div>
                    <input class="input-fieldD" type="text" id="filmRating">
                    <input type="submit" id="submission" value="SUBMIT">
                </form>
            </div>
       </div> 
       </div>
    `
};

const displayNewMovie = (title, poster, released, director, rating) => {
    return `
    <div class="row justify-content-center item-rows">
        <div class="col-4 border item-columns">
            <div class="row align-items-center">
                <div class="col-12 item-columns">
                    <h4>New Movie Information</h4>
                </div>
            </div>
            <div class="row justify-content-center">
                <div class="col-12 border item-columns">
                    <img class="sample-poster border" src="${poster}" alt="poster">
                </div>
            </div>
            <div class="row justify-content-center">
                <h3>
                    Title: 
                    <small class="text-muted"> ${title}</small>
                </h3>
            </div>
            <div class="row justify-content-center">
                <h3>
                    Release Year:  
                    <small class="text-muted"> ${released}</small>
                </h3>
            </div>
            <div class="row justify-content-center">
                <h3>
                    Directed By:  
                    <small class="text-muted"> ${director}</small>
                </h3>
            </div>
            <div class="row justify-content-center">
                <h3>
                    Your Rating:  
                    <small class="text-muted"> ${rating} Stars</small>
                </h3>
            </div>
            <div class="row justify-content-center">
                <div class="btn-group">
                <a href="./index.movies"><button type="button" class="btn btn-primary btn-sm">All Movies</button></a>
                <a href="./add-movie.html"><button type="button" class="btn btn-success btn-sm">Add Another</button></a>
          </div>
            </div>
        </div
    </div>
    `
}


const actorRow = (id, first_name, last_name) => {
    return `
    <div class="row justify-content-center item-rows">
        <div class="col-3 border-top border-left border-bottom border-success item-columns">
            <p><b>Site ID:</b> ${id}</p>
            <p><b>First Name:</b> ${first_name}</p>
            <p><b>Last Name:</b> ${last_name}</p>
        </div>
        <div class="col-3 border-top border-bottom border-success item-columns">
            <p style="margin-bottom: 0px;"><b>Films:</b><ul id="movie-list" data-id=${id}> </ul></p>
        </div>
        <div class="col-2 border-top border-right border-bottom border-success item-columns">
            <button id="edit-actor" data-id="${id}" type="button" class="btn btn-block btn-outline-danger">Update</button>
            <button id="delete-actor" data-id="${id}" type="button" class="btn btn-block btn-outline-warning">Delete</button>
        </div>
    </div>
    <div class="row update-actor-field hide-menu justify-content-center" data-id="${id}">
        <form class="update-form" data-id="${id}">
            <div class="form-row justify-content-center">
                <div class="col-4 border-top border-left border-bottom border-success item-columns">
                    <input class="update-form-fields" type="text" data-id="${id}"  id="update-first-name" value="${first_name}">
                    <input class="update-form-fields" type="text" data-id="${id}"  id="update-last-name" value="${last_name}">
                </div>
                <div class="col-4 border-top border-left border-bottom border-success item-columns">
                    <select multiple name="film-list" id="film-options" data-id="${id}">
                        <option selected disabled>Select Films Here</option>
                    </select>
                </div>
                <div class="col-4 border-top border-right border-bottom border-success item-columns">
                    <button id = "stop-post" data-id="${id}" type="button" class="close-button btn-sm btn-outline-dark">X</button>
                    <input type="submit" class="update-button btn-info" id="submit-update" data-id="${id}" value="Update Movie">
                </div>
            </div>
        </form>
    </div>
    `
}

const createMovieList = (title) => {
    return `
    <li>${title}</li>
    `
};

function createMovieOption(film){
    var option = document.createElement("option");
    option.setAttribute('data-id', film.id);
    option.innerHTML = film.title;
    return option;
};

function createCheckedMovieOption(film ) {
    var option = document.createElement("option");
    option.setAttribute('data-id', film.id);
    option.setAttribute('selected', 'selected')
    option.innerHTML = film.title;
    return option;
}

function populateFullDropdown(arr, loc){
    for (var i = 0; i < arr.length; i++){
        loc.appendChild(createMovieOption(arr[i]));
    }  
};

function populateDropdown(arr, checkArr, loc){
    for (var i = 0; i < arr.length; i++){
        if(checkArr.includes(arr[i].title)) {
            loc.appendChild(createCheckedMovieOption(arr[i])); 
        } else {
            loc.appendChild(createMovieOption(arr[i]));
        }

    }  
};

function newActor() {
    return `
    <div class="row justify-content-center item-rows">
        <div class="col-4 border item-columns">
            <div class="form-group">
                <form id="add-actor">
                <div class="menuBar">
                    <label class="menuBar" for="actor-first-name">Actor's First Name</label>
                </div>
                    <input type="text" id="actor-first-name">
                <div class="menuBar">
                    <label class="menuBar" for="actor-last-name">Actor's Last Name</label>
                </div>
                    <input type="text" id="actor-last-name">

                <div class="menuBar">
                    <label class="menuBar" for="actors-movies">Actor's Movies</label>
                </div>
                <select multiple name="film-list" id="film-options">
                    <option selected disabled>Select Films Here</option>
                </select>
                <hr />
                <input type="submit" id="submission" value="SUBMIT">
                </form>
            </div>
        </div>
    </div>
    
    `
};

const displayNewActor = (first_name, last_name) => {
    return `
    <div class="row justify-content-center item-rows">
        <div class="col-4 border item-columns">
            <div class="row align-items-center justify-content-center">
                <h3>
                    New Actor Information
                </h3>
            </div>
            <div class="row justify-content-center">
                <h3>
                    Name: 
                    <small class="text-muted"> ${first_name} ${last_name}</small>
                </h3>
            </div>
            <div class="row justify-content-center">
                <p>
                    <i>See Actor List for Assigned Films</i>
                </p>
            </div>
            <div class="row justify-content-center">
                <div class="btn-group">
                <a href="./actors.html"><button type="button" class="btn btn-primary btn-sm">All Actors</button></a>
                <a href="./add-actor.html"><button type="button" class="btn btn-success btn-sm">Add Another</button></a>
          </div>
            </div>
        </div
    </div>
    `
};

const displayHomePageMenu = ()=> {
    return `
    <div class="row justify-content-center main-body">
        <div class="col-8 align-self-center ">
            <div class="card-group">
                <div class="card text-center border border-success" style="width: 18rem;">
                    <img class="card-img-top home-page-pics " src="https://lewes.lib.de.us/files/2017/07/Movie-reel-film-reel-clipart.jpeg" alt="Movie reel" style="max-width: 300px;">
                    <div class="card-body">
                        <h5 class="card-title">MOVIES</h5>
                        <p class="card-text">Some quick example text to build on the card title and make up the bulk of the card's content.</p>
                        <a href="./movies.html" class="btn btn-primary">Go To Movies</a>
                    </div>
                </div>
                <div class="card text-center border border-success" style="width: 18rem;">
                    <img class="card-img-top home-page-pics " src="data:image/png;base64,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" alt="Acting Masks">
                    <div class="card-body">
                        <h5 class="card-title">ACTORS</h5>
                        <p class="card-text">Some quick example text to build on the card title and make up the bulk of the card's content.</p>
                        <a href="./actors.html" class="btn btn-primary">Go To Actors</a>
                    </div>
                </div> 
            </div>
        </div>
    </div>

    `
}



module.exports = {
    movieRow,
    newMovie,
    createActorList,
    displayNewMovie,
    actorRow,
    createMovieList,
    createMovieOption,
    createCheckedMovieOption,
    populateFullDropdown,
    populateDropdown,
    newActor,
    displayNewActor,
    displayHomePageMenu
};