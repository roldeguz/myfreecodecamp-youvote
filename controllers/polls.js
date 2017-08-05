const Poll = require('../models/Poll');

/**
 * GET /polls
 * Polls page.
 */
exports.index = (req, res, next) => {
  const new_polls = [];
  var sorted_choices = [];
  var owner = 0;
  Poll.find({}, function (err, polls) {
    if (err) { return next(err); }
    
    for (var i = 0; i < polls.length; i++) {
      owner = 0;
      const p = polls[i];
      
      if (req.hasOwnProperty('user') && (p.createdBy == req.user.profile.name || p.createdBy == req.user.email))
        owner = 1;
      
      sorted_choices = sortByKey(p.choices, 'count');
      new_polls.push({poll: p, most_votes: {choice: sorted_choices[0].choice, count:sorted_choices[0].count}, owner: owner});
    }
    
    res.render('polls', {
      title: 'Polls',
      polls: new_polls
    });
  });
};

/**
 * GET /new
 * New poll page.
 */
exports.getNewPoll = (req, res) => {
  res.render('new-poll', {
    title: 'New Poll'
  });
};

/**
 * POST /new
 * Create a new poll.
 */
 exports.postNewPoll = (req, res, next) => {
   
  let keys = Object.keys(req.body);
  let choicesArr = [];
  for(let i = 2; i < keys.length; i++) {
    choicesArr.push({choice: req.body[keys[i]], count: 0});
  }
   
  const poll = new Poll({
    title: req.body.title,
    createdBy: req.user.profile.name || req.user.email,
    choices: choicesArr
  }); 
  
  poll.save((err) => {
    if (err) { return next(err); }
    
    res.redirect('/polls');
  });
};

/**
 * GET /view/:id
 * View a poll.
 */
exports.viewPoll = (req, res, next) => {
  Poll.findOne({_id: req.params.id}, function(err, poll) {
    if (err) { return next(err); }
    
    const chartConfig = buildChartConfig(poll);
    const tweetURL = process.env.APP_URL + 'view/' + req.params.id;
    
    res.render('view-poll', {
      title: 'Poll',
      poll: poll,
      tweetURL: tweetURL,
      data: JSON.stringify(chartConfig),
      alreadyVoted: 0
    });
  });
};

/**
 * GET /delete/:id
 * Remove a poll.
 */
exports.deletePoll = (req, res, next) => {
  Poll.findOneAndRemove({_id: req.params.id}, function(err) {
    if (err) { return next(err); }
    
    res.redirect('/polls');
  });
};

/**
 * POST /view/:id
 * Vote.
 * Checking of ip from https://github.com/Mozar10/voteR/blob/master/checkIp.js
 */
exports.vote = (req, res, next) => {
  checkIp(req.params.id, req.headers['x-forwarded-for'], next).then(function (allowedToVote) {
    if (allowedToVote) {
      // Supplied value in the Other field
      if (req.body.hasOwnProperty('other') && req.body.other != '') {
        Poll.findByIdAndUpdate(
          req.params.id,
          { $push: { choices: { choice: req.body.other, count: 1 } }, $addToSet: { 'whoVoted': req.headers['x-forwarded-for'] } },
          { upsert: true },
          function (err, poll) {
              if (err) { return next(err); }
              
              res.redirect('/view/' + req.params.id);
          });
      } else {
        Poll.update(
          { _id: req.params.id, 'choices._id': req.body.choice },
          { $inc: { 'choices.$.count': 1 }, $addToSet: { 'whoVoted': req.headers['x-forwarded-for'] } },
          { upsert: true },
          function (err, poll) {
              if (err) { return next(err); }
              
              res.redirect('/view/' + req.params.id);
          }
        );
      }  
    } else {
      Poll.findOne({_id: req.params.id}, function(err, poll) {
        if (err) { return next(err); }
        
        const chartConfig = buildChartConfig(poll);
        const tweetURL = process.env.APP_URL + 'view/' + req.params.id;
        
        res.render('view-poll', {
          title: 'Poll',
          poll: poll,
          tweetURL: tweetURL,
          data: JSON.stringify(chartConfig),
          alreadyVoted: 1
        });
      });
    }
  });
};

/**
 * Build the config for chart rendering.
 */
function buildChartConfig(poll) {
  const choices = poll.choices;
  
  const category = [];
  const numVotes = [];
  const chart_data = [];
  
  for (var i = 0; i < choices.length; i++) {
    const c = choices[i];
    chart_data.push({value: c.count, name: c.choice});
    category[i] = c.choice;
    numVotes[i] = c.count;
  }
  
  const config = {
    tooltip: {
        trigger: 'item',
        formatter: "{b} : {c} ({d}%)"
    },
    legend: {
        x : 'center',
        y : 'bottom',
        data: category
    },
    series: [{
      type: 'pie',
      radius: '65%',
      roseType: 'angle',
      data: chart_data
    }]
  }
  
  return config;
}

/**
 * Sort choice array for the most votes.
 */
function sortByKey(array, key) {
  return array.sort(function(a, b) {
    var x = a[key]; var y = b[key];
    if(x < y) return 1;
    if(x > y) return -1;
    return 0;
  });
}

/**
 * Check for existing ip
 * https://github.com/Mozar10/voteR/blob/master/checkIp.js
 */
function checkIp(pollId, ipAddress, next) {
  return new Promise(function (resolve, reject) {
      Poll.findById(pollId, function (err, poll) {
          if (err) { return next(err); }
          let ipIsNew = poll.whoVoted.every(function(ip){return ip !== ipAddress});
          if(ipIsNew){
              return resolve(true);
          }else{
              return resolve(false);
          }
      });
  });
}