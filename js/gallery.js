$(".btn-deleter").on("click", function(){
    var gal_id = $(this).parent().children(".form-id-input").text();
    var gal_name = $(this).parent().children(".form-name-input").text();
    
    $("#delete-id").val(gal_id);
    $("#delete-name").html(gal_name);
});

$(".btn-updater").on("click", function(){
    var gal_id = $(this).parent().children(".form-id-input").text();
    var gal_name = $(this).parent().children(".form-name-input").text();
    var gal_type = $(this).parent().children(".form-type-input").text();
    var gal_price = $(this).parent().children(".form-price-input").text();
    var gal_desc = $(this).parent().children(".form-desc-input").text();
    
    $("#edit-id").val(gal_id);
    $("#edit-name").html(gal_name);
    $("#edit-type").val(gal_type);
    $("#edit-price").val(gal_price);
    $("#edit-desc").val(gal_desc);
});