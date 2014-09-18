function getOptions(argv, convertionTable){
  function convert(t){
    var tbl={};
    for(var i=0;i<t.length;i++){
      if(t[i+1]==":"){
        tbl[t[i]]=true;
        i++;
      }else{
        tbl[t[i]]=false;
      }
    }
    return tbl;
  }
  convertionTable=convert(convertionTable);

  var ret=[];
  for(var i=0;i<argv.length;i++){
    var arg=argv[i];
    if(arg[0]!="-"){
      continue;
    }else if(arg[1]=="-"){
      console.error("Long Arg currently not supported");
      continue;
    }else{
      if(arg.length==1){
        argv.splice(i, 1);
        i--;
        continue;
      }else{
        var hasArg=convertionTable[arg[1]];
        if(hasArg==null){
          throw "Invalid argument "+arg;
          return;
        }else if(hasArg){
          if(arg.length==2){
            if(i+1==argv.length){
              throw "Need an argument "+arg;
            }else{
              ret.push({cmd:arg, arg:argv[i+1]});
              argv.splice(i, 2);
              i--;
            }
          }else{
            ret.push({cmd:arg.substr(0,2), arg:arg.substr(2)});
            argv.splice(i, 1);
            i--;
          }
        }else{
          ret.push({cmd:arg.substr(0, 2)});
          argv[i]="-"+arg.substr(2);
          i--;
        }
      }
    }
  }
  return ret;
}

module.exports=getOptions;