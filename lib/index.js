var _ = require('lodash')
  , Promise = require('bluebird')
  , moment = require('moment')
  , crypto = require('crypto')
  , restify = require('restify')
  , qs = require('qs')
  , log = require('@ftbl/log')
  , configuration = require('@ftbl/configuration');

var Stats = function() {
  if (this instanceof Stats === false) return new Stats();

  this.client = restify.createJsonClient({
    url: 'http://api.stats.com'
  });

  this.key = configuration('stats:key');
  this.secret = configuration('stats:secret');
  this.sig = crypto.createHash('sha256').update(this.key + this.secret + moment.utc().unix()).digest('hex');
  this.qs = qs.stringify({ api_key: this.key, sig: this.sig });
};

var get = function(path) {
  var url = [ '/v1/stats/soccer/' + path + '/', this.qs ].join('?');
  return new Promise(function(resolve, reject) {
    return this.client.get(url, function(err, response) {
      if (err) {
        log.error(path + ': ' + err.statusCode);
        return resolve(); // Swallow
      }
      return resolve(JSON.parse(response.res.body).apiResults);
    });
  }.bind(this));
};

Stats.prototype.leagues = function() {
  return get.call(this, 'leagues').then(function(data) {
    if (data == null) return;
    return data[0].leagues;
  });
};

Stats.prototype.league = function(id) {
  return this.leagues().then(function(leagues) {
    if (leagues == null) return;
    return _(leagues).find(function(league) {
      return league.league.leagueId === id;
    }).league;
  });
};

var leaguePath = function(league) {
  var paths = _.chain(league.uriPaths).sortBy(function(path) {
    return path.pathSequence;
  }).pluck('path').value();

  return paths.join('/');
};

Stats.prototype.teams = function(league) {
  var url = [ leaguePath(league), 'teams' ].join('/');
  return get.call(this, url).then(function(data) {
    if (data == null) return;
    return data[0].league.season.conferences[0].divisions[0].teams;
  });
};

Stats.prototype.players = function(league, team) {
  var url = [ leaguePath(league), 'participants', 'teams', team.teamId ].join('/');
  return get.call(this, url).then(function(data) {
    if (data == null) return;
    return data[0].league.players;
  });
};

module.exports = new Stats;