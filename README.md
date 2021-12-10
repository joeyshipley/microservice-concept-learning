### Stuff

##### .env File
- Using the .env.TEMPLATE file as reference, create a .env.local file in the Azure-Storage service with the values needed to connect to your azure storage account.

##### Run DEV
```
> docker-compose up --build
```

##### Run PROD
```
> docker-compose -f docker-compose.PROD.yml up --build
```

##### Db: Video Streaming
- Connect to MongoDB on PORT 4040
- Add db: video-streaming
- Add collection: videos
- Add record:```
{
  "_id": { "$oid": "5d9e690ad76fe06a3d7ae416" },
  "videoPath": "SampleVideo_1280x720_1mb.mp4"
}
```

##### Db: Stream History
- Connect to MongoDB on PORT 4041

##### TestUrl
```
http://localhost:4000/video?id=5d9e690ad76fe06a3d7ae416
```
