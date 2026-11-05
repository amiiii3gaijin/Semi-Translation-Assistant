import { Segment, useDefault } from 'segmentit';
const segment = new Segment();
const segmentit = useDefault(segment);
console.log(JSON.stringify(segment.POSTAG));
