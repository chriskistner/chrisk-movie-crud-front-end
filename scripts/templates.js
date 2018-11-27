const movieRow =(title, released, director, rating, poster,) => {
    return `
    <div class="row blog-row">
        <div class="col-4 border">
            <img src="${poster}" height="42">
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
    </div>
    `
};

module.exports = {
    movieRow,
}