const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 3000;

app.use(cors())
app.use(express.json())

app.get('/', (req,res)=>{
    req.send('Server i s running')
})

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});