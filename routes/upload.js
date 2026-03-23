var express = require("express");
var router = express.Router();
let { uploadImage, uploadExcel } = require('../utils/uploadHandler')
let path = require('path')
let excelJS = require('exceljs')
let fs = require('fs');
let productModel = require('../schemas/products')
let InventoryModel = require('../schemas/inventories')
let userController = require('../controllers/users')
let userModel = require('../schemas/users')
let roleModel = require('../schemas/roles')
let cartModel = require('../schemas/cart')
let mailHandler = require('../utils/sendMailHandler')
let mongoose = require('mongoose')
let slugify = require('slugify')
let crypto = require('crypto')

function generateRandomPassword(length = 16) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let password = '';
    while (password.length < length) {
        const randomIndex = crypto.randomInt(0, chars.length);
        password += chars[randomIndex];
    }
    return password;
}

router.post('/single', uploadImage.single('file'), function (req, res, next) {
    if (!req.file) {
        res.status(404).send({
            message: "file upload rong"
        })
    } else {
        res.send(req.file.path)
    }
})
router.post('/multiple', uploadImage.array('files'), function (req, res, next) {
    if (!req.files) {
        res.status(404).send({
            message: "file upload rong"
        })
    } else {
        let data = req.body;
        console.log(data);
        let result = req.files.map(f => {
            return {
                filename: f.filename,
                path: f.path,
                size: f.size
            }
        })
        res.send(result)
    }
})
router.get('/:filename', function (req, res, next) {
    let fileName = req.params.filename;
    let pathFile = path.join(__dirname, '../uploads', fileName)
    res.sendFile(pathFile)

})

router.post('/excel', uploadExcel.single('file'), async function (req, res, next) {
    if (!req.file) {
        res.status(404).send({
            message: "file upload rong"
        })
    } else {
        //workbook->worksheet-row/column->cell
        let pathFile = path.join(__dirname, '../uploads', req.file.filename)
        let workbook = new excelJS.Workbook();
        await workbook.xlsx.readFile(pathFile);
        let worksheet = workbook.worksheets[0];
        let products = await productModel.find({});
        let getTitle = products.map(p => p.title)
        let getSku = products.map(p => p.sku)
        let result = [];
        let errors = [];
        for (let index = 2; index <= worksheet.rowCount; index++) {
            let errorRow = [];
            const row = worksheet.getRow(index)
            let sku = row.getCell(1).value;//unique
            let title = row.getCell(2).value;
            let category = row.getCell(3).value;
            let price = Number.parseInt(row.getCell(4).value);
            let stock = Number.parseInt(row.getCell(5).value);
            //validate
            if (price < 0 || isNaN(price)) {
                errorRow.push("dinh dang price chua dung " + price)
            }
            if (stock < 0 || isNaN(stock)) {

            router.post('/users', uploadExcel.single('file'), async function (req, res, next) {
                if (!req.file) {
                    return res.status(404).send({
                        message: 'file upload rong'
                    })
                }

                let pathFile = path.join(__dirname, '../uploads', req.file.filename)
                let workbook = new excelJS.Workbook();
                let result = [];

                try {
                    await workbook.xlsx.readFile(pathFile);
                    let worksheet = workbook.worksheets[0];
                    let userRole = await roleModel.findOne({ name: /^(user)$/i, isDeleted: false });

                    if (!userRole) {
                        return res.status(400).send({
                            message: 'khong tim thay role user'
                        })
                    }

                    let existingUsers = await userModel.find({}).select('username email');
                    let usernames = new Set(existingUsers.map(u => (u.username || '').toLowerCase()));
                    let emails = new Set(existingUsers.map(u => (u.email || '').toLowerCase()));

                    for (let index = 2; index <= worksheet.rowCount; index++) {
                        const row = worksheet.getRow(index)
                        let username = (row.getCell(1).value || '').toString().trim();
                        let email = (row.getCell(2).value || '').toString().trim().toLowerCase();
                        let errorRow = [];

                        if (!username) {
                            errorRow.push('username khong duoc rong')
                        }

                        if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
                            errorRow.push('email khong dung dinh dang')
                        }

                        if (usernames.has(username.toLowerCase())) {
                            errorRow.push('username da ton tai')
                        }

                        if (emails.has(email)) {
                            errorRow.push('email da ton tai')
                        }

                        if (errorRow.length > 0) {
                            result.push({ success: false, data: errorRow, row: index })
                            continue;
                        }

                        let rawPassword = generateRandomPassword(16);
                        let session = await mongoose.startSession()
                        session.startTransaction()

                        try {
                            let newUser = await userController.CreateAnUser(
                                username,
                                rawPassword,
                                email,
                                userRole._id,
                                session
                            )

                            let newCart = new cartModel({
                                user: newUser._id
                            })
                            await newCart.save({ session })

                            await session.commitTransaction();
                            await session.endSession()

                            usernames.add(username.toLowerCase())
                            emails.add(email)

                            try {
                                await mailHandler.sendUserImportPassword(email, username, rawPassword)
                                result.push({ success: true, data: `tao user ${username} thanh cong va da gui mail`, row: index })
                            } catch (mailError) {
                                result.push({ success: true, data: `tao user ${username} thanh cong, gui mail that bai: ${mailError.message}`, row: index })
                            }
                        } catch (error) {
                            await session.abortTransaction();
                            await session.endSession()
                            result.push({ success: false, data: [error.message], row: index })
                        }
                    }

                    return res.send(result)
                } catch (error) {
                    return res.status(400).send({ message: error.message })
                } finally {
                    if (fs.existsSync(pathFile)) {
                        fs.unlinkSync(pathFile);
                    }
                }
            })
                errorRow.push("dinh dang stock chua dung " + stock)
            }
            if (getTitle.includes(title)) {
                errorRow.push("title da ton tai")
            }
            if (getSku.includes(sku)) {
                errorRow.push("sku da ton tai")
            }
            if (errorRow.length > 0) {
                result.push({ success: false, data: errorRow })
                continue;
            } else {
                let session = await mongoose.startSession()
                session.startTransaction()
                try {
                    let newObj = new productModel({
                        sku: sku,
                        title: title,
                        slug: slugify(title, {
                            replacement: '-', remove: undefined,
                            locale: 'vi',
                            trim: true
                        }), price: price,
                        description: title,
                        category: category
                    })
                    let newProduct = await newObj.save({ session });
                    let newInv = new InventoryModel({
                        product: newProduct._id,
                        stock: stock
                    })
                    newInv = await newInv.save({ session })
                    await newInv.populate('product')
                    await session.commitTransaction();
                    await session.endSession()
                    getSku.push(sku);
                    getTitle.push(title)
                    result.push({ success: true, data: newInv });
                } catch (error) {
                    await session.abortTransaction();
                    await session.endSession()
                    errorRow.push(error.message)
                    result.push({ success: false, data: errorRow })
                }
            }
        }
        result = result.map(function (e, index) {
            if (e.success) {
                return (index + 1) + ": " + e.data.product.title
            } else {
                return (index + 1) + ": " + e.data
            }
        })
        res.send(result)
        fs.unlinkSync(pathFile);

    }
})


module.exports = router;