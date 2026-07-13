require('dotenv').config()
const express = require('express')
const morgan = require('morgan')
const Person = require('./models/person')

const app = express()

app.use(express.static('dist'))
app.use(express.json())

morgan.token('body', (request, response) => JSON.stringify(request.body))

app.use(morgan(':method :url :status :res[content-length] - :response-time ms :body'))

app.get('/api/persons', (request, response) => {
    Person.find({}).then(persons => {
        response.json(persons)
    })
})

app.get('/api/persons/:id', (request, response, next) => {
    Person.findById(request.params.id)
        .then(person => {
            if (person) {
                response.json(person)
            } else {
                response.status(404).end()
            }  
        })
        .catch(error => next(error))
})

app.delete('/api/persons/:id', (request, response, next) => {
    Person.findByIdAndDelete(request.params.id)
        .then(result => {
            response.status(204).end()
        })
        .catch(error => next(error))
})

app.post('/api/persons', (request, response, next) => {
    const body = request.body
    if (!body.name || !body.number) {
        return response.status(400).json({
            error: 'name or number is missing'
        })
    }
    Person.find({ name: body.name }).then(result => {
        if (result.length === 0) { // makes sure names do not repeat in database
            const person = new Person({
                name: body.name,
                number: body.number,
            })

            person.save()
                .then(savedPerson => {
                    response.json(savedPerson)
                })
                .catch(error => next(error))
        } else {
            response.status(400).json({ error: 'name must be unique' })
        }
    })

    
})

app.put('/api/persons/:id', (request, response, next) => {
    const { name, number } = request.body
    Person.findById(request.params.id)
        .then(person => {
            if (!person) {
                return response.status(404).end()
            }

            person.name = name
            person.number = number

            return person.save().then(updatedPerson => {
                response.json(updatedPerson)
            })
        })
        .catch(error => next(error))
})

app.get('/info', (request, response) => {
    Person.find({}).then(persons => {
        const now = new Date()
        response.send(`
            <div>Phonebook has info for ${persons.length} people</div>
            <div>${now.toString()}<div/>
        `)
    })
})

const unknownEndpoint = (request, response) => {
    response.status(400).send({ error: 'unknown endpoint' })
}
app.use(unknownEndpoint) // handles request of unknown endpoints

const errorHandler = (error, request, response, next) => {
    console.error(error.message)

    if (error.name === "CastError") { // handles situations where ids are formatted wrong
        return response.status(400).send({ error: 'malformatted id' })
    } else if (error.name == "ValidationError") {
        return response.status(400).json({ error: error.message }) // returning a json so front end can access it for error message showing
    }

    next(error)
}

app.use(errorHandler)

const PORT = process.env.PORT
app.listen(PORT)
console.log(`Server running on port ${PORT}`)