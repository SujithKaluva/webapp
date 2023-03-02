const imageController = require("../controller/imageController");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");

// Configure Multer to store files with a unique name
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = './uploads';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath);
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueId = uuidv4();
    const currentDate = new Date().toISOString();
    const fileName = `${uniqueId}_${currentDate}_${file.originalname}`;
    cb(null, fileName);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    const error = new Error(`File type ${file.mimetype} not allowed.`);
    error.status = 400;
    cb(error);
  }
};

const upload = multer({ storage, fileFilter });

const router = require("express").Router();

router.post(
  "/:productId/image",
  upload.single("image"),
  imageController.addImage
);

router.get("/:productId/image", imageController.getAllImages);

router.get("/:productId/image/:imageId", imageController.getImage);

router.delete("/:productId/image/:imageId", imageController.deleteImage);

module.exports = router;
