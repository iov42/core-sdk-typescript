# Use cases

In order to showcase the use of the iov42 platform, we discuss how specific use cases could be implmemented.

## Car purchase

In this scenario Alice wants to sell her car to Bob. Bob only wants to buy the car if Alice can prove that the
first registration of the car was not longer than ten years ago (assuming the reference year is 2020).
Also in this scenario we assume that there is a fictional authority responsible for motor vehicles
(MVA - like the DMV in the US or the DVLA in Britain, ...). The MVA identity has to create an Asset Type "Car"
as preparation step.

How to run the car purchase scenario:
```shell
$ git clone https://github.com/iov42/core-sdk-typescript.git
$ cd use-cases
$ ts-node car-purchase.ts
```

