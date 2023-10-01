var express = require('express');
var router = express.Router();
const { isLoggedIn } = require('../helpers/util');
const moment = require('moment');
const path = require('path');
const fs = require('fs')

module.exports = function (db) {
  router.get('/', isLoggedIn, async function (req, res, next) {
    const { page = 1, title, strDate, endDate, complete, type_search, sort } = req.query;
    const queries = [];
    const params = [];
    const paramscount = [];
    const limit = 5;
    const offset = (page - 1) * 5;
    let typeSort;
    const { rows: profil } = await db.query('SELECT * FROM "users" WHERE id = $1', [req.session.user.userid]);

    params.push(req.session.user.userid)
    paramscount.push(req.session.user.userid)

    if (title) {
      params.push(title);
      paramscount.push(title);
      queries.push(`title ILIKE '%' || $${params.length} || '%'`);
    };

    if (strDate && endDate) {
      params.push(strDate, endDate);
      paramscount.push(strDate, endDate);
      queries.push(`deadline BETWEEN $${params.length - 1} and $${params.length}`);
    } else if (strDate) {
      params.push(strDate);
      paramscount.push(strDate);
      queries.push(`deadline >= $${params.length}`);
    } else if (endDate) {
      params.push(endDate);
      paramscount.push(endDate);
      queries.push(`deadline <= $${params.length}`);
    };

    if (complete) {
      params.push(JSON.parse(complete));
      paramscount.push(JSON.parse(complete));
      queries.push(`complete = $${params.length}`);
    }

    let sqlcount = 'SELECT COUNT (*) AS total FROM todos WHERE userid = $1';
    let sql = `SELECT * FROM todos WHERE userid = $1`;
    if (queries.length > 0) {
      sql += ` AND (${queries.join(` ${type_search} `)})`
      sqlcount += ` AND (${queries.join(` ${type_search} `)})`
    }

    if (sort) {
      sql += ` ORDER BY ${sort}`
      typeSort = sort.replace(' ', '+')
    }

    params.push(limit, offset);
    sql += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    db.query(sqlcount, paramscount, (err, { rows: data }) => {
      if (err) res.send(err)
      else {
        const total = data[0].total;
        const pages = Math.ceil(total / limit);
        db.query(sql, params, (err, { rows: data }) => {
          if (err) res.render(err)
          else res.render('user/list', { data, query: req.query, pages, offset, page, url: req.url, moment, typeSort, profil: profil[0] })
        })
      }
    })
  });

  router.get('/add', isLoggedIn, (req, res) => {
    res.render('user/add')
  })

  router.post('/add', isLoggedIn, (req, res) => {
    db.query('INSERT INTO todos (title, userid) VALUES ($1, $2)',
      [req.body.title, req.session.user.userid], (err) => {
        if (err) res.send(err)
        else res.redirect('/users')
      })
  })

  router.get('/edit/:index', isLoggedIn, (req, res) => {
    const index = req.params.index
    db.query('SELECT * FROM todos WHERE id = $1', [index], (err, { rows: data }) => {

      if (err) res.send(err)
      else res.render('user/edit', { data, moment })
    })
  })

  router.post('/edit/:index', isLoggedIn, (req, res) => {
    const index = req.params.index
    const { title, deadline, complete } = req.body;
    db.query('UPDATE todos SET title = $1, complete = $2, deadline = $3 WHERE id = $4',
      [title, Boolean(complete), deadline, index], (err, data) => {
        if (err) res.send(err)
        else res.redirect('/users')
      })
  })

  router.get('/delete/:index', isLoggedIn, (req, res) => {
    const index = req.params.index
    db.query('DELETE FROM todos WHERE id = $1', [index], (err) => {
      if (err) res.send(err)
      else res.redirect('/users')
    })
  })

  router.get('/upload', isLoggedIn, function (req, res) {
    res.render('user/upload', { prevAvatar: req.session.user.avatar })
  })

  router.post('/upload', isLoggedIn, async function (req, res) {
    let avatar;
    let uploadPath;

    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).send('No files were uploaded.');
    }

    avatar = req.files.avatar;
    let fileName = Date.now() + '_' + avatar.name
    uploadPath = path.join(__dirname, '..', 'public', 'images', fileName);

    avatar.mv(uploadPath, async function (err) {
      if (err)
        return res.status(500).send(err);
      try {
        const { rows: profil } = await db.query('SELECT * FROM "users" WHERE id = $1', [req.session.user.userid]);
        if (profil[0].avatar) {
          const filePath = path.join(__dirname, '..', 'public', 'images', profil[0].avatar);
          try { fs.unlinkSync(filePath) } catch {
            const { rows } = await db.query('UPDATE "users" SET avatar = $1 WHERE id = $2', [fileName, req.session.user.userid]);
            res.redirect('/users');
          }
        }
        const { rows } = await db.query('UPDATE "users" SET avatar = $1 WHERE id = $2', [fileName, req.session.user.userid]);
        res.redirect('/users');
      } catch {
        res.send(err)
      }
    });
  });

  return router
}