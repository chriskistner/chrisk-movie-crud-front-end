const movieRow =(id, title, released, director, rating, poster) => {
    return `
    <div class="row justify-content-center item-rows">
        <div class="col-2 border-top border-left border-bottom">
            <img src="${poster}" height="200px">
        </div>
        <div class="col-2 border-top border-bottom">
            <p style="margin-bottom: 0px;">Site ID: ${id}</p>
            <p style="margin-bottom: 0px;">Title: ${title}</p>
            <p style="margin-bottom: 0px;">Released: ${released}</p>
            <p style="margin-bottom: 0px;">Rating: ${rating}</p>
            
        </div>

        <div class="col-3 border-top border-bottom">
            <p style="margin-bottom: 0px;">Actors:<ul id="actor-list" data-id=${id}> </ul></p>
        </div>
        <div class="col-2 border-top border-right border-bottom">
        <div class="blog-box">
        <button id="edit-film" data-id="${id}" type="button" class="btn btn-outline-danger">Update</button>
        <button id="delete-film" data-id="${id}" type="button" class="btn btn-outline-warning">Delete</button>
    </div>
        </div>
    </div>
    <div class="row update-field hide-menu border justify-content-center" data-id="${id}">
        <div class="col-8">
            <form id="submit-updated-post" data-id="${id}">
                <button id = "stop-post" data-id="${id}" type="button" class="btn btn-outline-dark">X</button>
                <input class="input-fieldE" type="text" data-id="${id}"  id="update-poster" value="${poster}">
                <input class="input-fieldA" type="text" data-id="${id}"  id="update-title" value="${title}">
                <input class="input-fieldB" type="text" data-id="${id}"  id="update-released" value="${released}">
                <input class="input-fieldC" type="text" data-id="${id}"  id="update-director" value="${director}">
                <input class="input-fieldD" type="text" data-id="${id}"  id="update-rating" value="${rating}">
                <input type="submit" id="submit-update" data-id="${id}" value="Update Movie">
            </form>
        </div>
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
            <div class="col-4 border">
                <div class="form-group">
                <form id="submit-movie">
                    <div class="row align-items-center justify-content-between">
                        <div class="col">
                            <h2>Movie Information</h2>
                        </div>
                    </div>
                <div class="row justify-content-center">
                    <div class="col-sm">
                        <img class="input-fieldE" src="https://via.placeholder.com/150" alt="poster">
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

const displayNewMovie = (title, poster,released, director, rating) => {
    return `
    <div class="row justify-content-center item-rows">
        <div class="col-4 border">
            <div class="row align-items-center">
                <div class="col-12">
                    <h4>New Movie Information</h4>
                </div>
            </div>
            <div class="row justify-content-center">
                <div class="col-12 border">
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
            <div>
        </div
    </div>
    `
}

module.exports = {
    movieRow,
    newMovie,
    createActorList,
    displayNewMovie
};