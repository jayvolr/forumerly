$( document ).ready(function() {

  // Enable Bootstrap tooltips
  $(function (){$('[data-toggle="tooltip"]').tooltip({container: 'body'})})

  // Profile image upload
  $("#profile-img").on('click', () => {
    $("#file-selector").click()
  })
  $("#file-selector").on('change', () => {
    $('#upload-button').css('display', 'block')
  })

});
