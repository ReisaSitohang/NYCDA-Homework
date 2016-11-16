'use strict'
//import modules
const express    =  require ( 'express' )
const app        =  express( )
const bodyParser =  require('body-parser')
const Sequelize  =  require('sequelize');
const session    =  require('express-session')
const bcrypt     =  require('bcrypt-nodejs')
const db         =  new Sequelize('nodeblog', process.env.POSTGRES_USER, process.env.POSTGRES_PASSWORD,{
						host: 'localhost',
						dialect: 'postgres'
					});

//set views
app.set('views', './views');
app.set('view engine', 'pug');

//middlewares
app.use (express.static(__dirname + '/public'))
app.use (bodyParser.urlencoded({     
	extended: true
})); 
app.use(session({
	secret: 'hushhush',
	resave: true,
	saveUninitialized: false
}));

//Define database structure
let User  = db.define( 'user', {
	name: Sequelize.STRING,
	lastname: Sequelize.STRING,
	birthday: Sequelize.STRING,
	email: { type: Sequelize.STRING, unique: true },
	password: Sequelize.STRING
} )

let Post = db.define( 'post', {
	title: Sequelize.STRING,
	body: Sequelize.TEXT,
} )

let Comment = db.define( 'comment', {
	body: Sequelize.TEXT,
} )

//___________Define relations______________
User.hasMany ( Post )
Post.belongsTo ( User )

Post.hasMany( Comment )
Comment.belongsTo( Post )

User.hasMany( Comment )
Comment.belongsTo( User )

db.sync({force: false}).then( ()=> {
	console.log("N-sync")
})

//____________Set express routers________________
//Homepage/Login-page
app.get( '/', ( req, res ) => {
	console.log(req.query.message)
	res.render( 'index', {
		message: req.query.message,
		user: req.session.user
	} )
} )

//Login route
app.post('/login', function (req, respond) {
	let Password = req.body.password

	if(req.body.email.length === 0) {
		res.redirect('/?message=' + encodeURIComponent("Please fill out your email address."));
		return;
	}
	if(req.body.password.length === 0) {
		res.redirect('/?message=' + encodeURIComponent("Please fill out your password."));
		return;
	}
	User.findOne({
		where: {
			email: req.body.email
		}
	}).then(function (user) {
		bcrypt.compare(Password, user.password, function(err, res) {
			console.log(res)
			if (user !== null && res === true) {
				req.session.user = user;
				respond.redirect('/myposts');
			} else {
				console.log(user.password)
				respond.redirect('/?message=' + encodeURIComponent("Invalid email or password."));
			}
		}, function (error) {
			respond.redirect('/?message=' + encodeURIComponent("Invalid email or password."));
		})
	})
})


//Logout route
app.get('/logout', function (req, res) {
	req.session.destroy(function(error) {
		if(error) {
			throw error;
		}
		res.redirect('/?message=' + encodeURIComponent("Successfully logged out."));
	})
});


//My posts, viewable after login success
app.get( '/myposts', ( req, res ) => {
	var user = req.session.user;
	if (user === undefined) {
		res.redirect('/?message=' + encodeURIComponent("Please log in to view your profile."));
	} else {
		Post.findAll({
			where: {
				userId: user.id
			}
		}).then( post=> {
			// res.send( post )
			res.render('myposts', {result: post, user:user})
		})
	}
} )

//Create post

app.get( '/createpost', ( req, res ) => {
	var user = req.session.user;
	if (user === undefined) {
		res.redirect('/?message=' + encodeURIComponent("Please log in to view your profile."));
	} else {
		res.render('createpost', {
			user: user
		});
	}
} )

app.post( '/redirectcreatepost', ( req, res ) => {
	var user = req.session.user;
	if (user === undefined) {
		res.redirect('/?message=' + encodeURIComponent("Please log in to view your profile."));
	} else {
		User.findOne({
			where: {
				id: user.id
			}
		}).then	( user =>{
			user.createPost({
				title: req.body.title,
				body: req.body.bericht
			})
		}).then ( post =>{
			console.log(post)
			res.redirect('myposts')
		})	
	}
} )

//All posts page

app.get( '/allposts', ( req, res ) => {
	var user = req.session.user;
	if (user === undefined) {
		res.redirect('/');
	} else {
		Post.findAll({
			include: [
			{
				model: User,
				attributes:['name', 'lastname']
			},
			{
				model: Comment,
				attributes:['body'],
				include: [{
					model: User,
					attributes:['name', 'lastname']
				}]
			}]
		}).then( post =>{
			console.log( post[0].comments )
			// res.send(post)
	 	res.render('allposts', {result: post, user:user})
	 })
	}
} )

//Adding comment to comment model in db

app.post( '/commentonpost', ( req, res ) => {
	var user = req.session.user;
	if (user === undefined) {
		res.redirect('/');
	} else {
		User.findOne({
			where: {
				id: user.id
			}
		}).then( user =>{
			user.createComment({
				body: req.body.bericht,
				postId: req.body.postId
			}).then ( comment =>{
				res.redirect('allposts')
			})
		})		
	}
} )



//Register route, after registering redirect to login
app.get( '/register', ( req, res ) => {
	res.render( 'register', {
		message: req.query.message
		} )
} )

app.post( '/register', ( req, res ) => {
	let password = req.body.pswrd1

	console.log(req.body)

	if(req.body.firstName.length === 0) {
		res.redirect('/register?message=' + encodeURIComponent("Please fill out your name."));
		return;
	}
	if(req.body.lastName.length === 0) {
		res.redirect('/register?message=' + encodeURIComponent("Please fill out your last name."));
		return;
	}
	if(req.body.birthDay.length === 0) {
	res.redirect('/register?message=' + encodeURIComponent("Please fill out your password."));
		return;
	}
	if(req.body.emailAddress.length === 0) {
		res.redirect('/register?message=' + encodeURIComponent("Please fill out your email address."));
		return;
	}
	if(req.body.pswrd.length === 0) {
		res.redirect('/register?message=' + encodeURIComponent("Please fill out your password."));
		return;
	}
	if(req.body.pswrd2.length === 0) {
		res.redirect('/register?message=' + encodeURIComponent("Please fill out your password."));
		return;
	}
	if(req.body.pswrd2.length !== req.body.pswrd.length) {
		res.redirect('/register?message=' + encodeURIComponent("Your passwords don't match, please re-enter."));
		return;
	}

	bcrypt.hash(password, null, null, (err, hash)=> {
		User.create( {
			name: req.body.firstName,
			lastname: req.body.lastName,
			birthday: req.body.birthDay,
			email: req.body.emailAddress,
			password: hash
		} ).then( ()=> {
			res.redirect( '/' )
			throw 'error'
		} ).catch((err)=>{
			var error="Error"
			res.render('register',{error, usedemail: req.body.emailAddress, })
			console.log(req.body.emailAddress+"already exists")
		})
	})
} )


app.listen(3000, function () {
	console.log('3000 is a beautiful song')
} )