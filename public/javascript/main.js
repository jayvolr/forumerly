$( document ).ready(function() {
  $(function (){$('[data-toggle="tooltip"]').tooltip({container: 'body'})}) //bootstrap tooltips
  $("#profile-img").on('click', () => {
    $("#file-selector").click()
  })
  $("#file-selector").on('change', () => {
    $('#upload-button').css('display', 'block')
  })
});
