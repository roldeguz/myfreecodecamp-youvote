$(document).ready(function() {
  $('#add-option').click(function() {
    var numChoices = $('.choice').length + 1;  
    $('.choices').append('<div class="form-group"><label class="col-sm-3 control-label" for="option-four">Option ' + numChoices + '</label><div class="col-sm-7"><input class="form-control choice" type="text" name="option-' + numChoices + '" id="option-' + numChoices + '" placeholder="Option ' + numChoices + '" required=""></div></div>');
  });
});