const movieRow =(id, title, released, director, rating, poster,) => {
    return `
    <div class="row border">
        <div class="col-2 border">
            <img src="${poster}" height="200px">
        </div>
        <div class="col-2">
            <p style="margin-bottom: 0px;">Title: ${title}</p>
        </div>
        <div class="col-2">
            <p style="margin-bottom: 0px;">Released: ${released}</p>
        </div>
        <div class="col-2">
            <p style="margin-bottom: 0px;">Director: ${director}</p>
        </div>
        <div class="col-2">
            <p style="margin-bottom: 0px;">Rating: ${rating}</p>
        </div>
        <div class="col-2">
        <div class="blog-box">
        <button id="edit-film" data-id="${id}" type="button" class="btn btn-outline-danger">Update</button>
        <button id="delete-film" data-id="${id}" type="button" class="btn btn-outline-warning">Delete</button>
    </div>
        </div>
    </div>
    <div class="row update-field hide-menu border" data-id="${id}">
        <div class="col-12">
            <form id="submitUpdatedPost">
                <button id = "stop-post" data-id="${id}" type="button" class="btn btn-outline-dark">X</button>
                <input class="input-fieldB" type="text" id="updateTitle" value="${poster}">
                <input class="input-fieldA" type="text" id="updateTitle" value="${title}">
                <input class="input-fieldB" type="text" id="updateTitle" value="${released}">
                <input class="input-fieldC" type="text" id="updateTitle" value="${director}">
                <input class="input-fieldD" type="text" id="updateTitle" value="${rating}">
                <input type="submit" id="submitUpdate" value="Update">
            </form>
        </div>
    </div>
    `
};

const newMovie = () => {
    return `
        <div class="form-group">
            <form id="submitPost">
              <div class="row align-items-center justify-content-between">
                  <div class="col-12">
                      <h2>Movie Information</h2>
                  </div>
                </div>
                <div class="menuBar">
                <input class="input-fieldE" type="image" id="filmPoster" src="https://via.placeholder.com/275" alt="photo">

                    <label class="menuBar" for="filmTitle">Movie Title</label>
                </div>
                    <input class="input-fieldA" type="text" id="filmTitle">

                <div class="menuBar">
                    <label class="menuBar" for="filmRelease">Release Year</label>
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
    `
}

module.exports = {
    movieRow,
    newMovie
}