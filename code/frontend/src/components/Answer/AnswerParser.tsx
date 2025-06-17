import { AskResponse, Citation } from "../../api";
import { cloneDeep } from "lodash-es";


type ParsedAnswer = {
    citations: Citation[];
    markdownFormatText: string;
};

let filteredCitations = [] as Citation[];

// Define a function to check if a citation with the same Chunk_Id already exists in filteredCitations
const isDuplicate = (citation: Citation,citationIndex:string) => {
    return filteredCitations.some((c) => c.chunk_id === citation.chunk_id && c.id === citation.id) ;
};
export function parseAnswer(answer: AskResponse): ParsedAnswer {
    let answerText = answer.answer;
    const citationLinks = answerText.match(/\[(doc\d\d?\d?)]/g);
    const lengthDocN = "[doc".length;
    let filteredCitations = [] as Citation[];
    let citationReindex = 0;

    // If no citation links found in text, return answer as-is
    if (!citationLinks || !answer.citations || answer.citations.length === 0) {
        return {
            citations: answer.citations || [],
            markdownFormatText: answerText
        };
    }

    citationLinks.forEach(link => {
        // Extract citation index from [docN] format
        let citationIndex = link.slice(lengthDocN, link.length - 1);
        let citationNumber = Number(citationIndex);

        // Check if citation exists at this index (arrays are 0-based, but doc references are 1-based)
        if (citationNumber > 0 && citationNumber <= answer.citations.length) {
            let citation = cloneDeep(answer.citations[citationNumber - 1]) as Citation;

            // Only process if citation is defined
            if (citation) {
                if (!isDuplicate(citation, citationIndex)) {
                    answerText = answerText.replaceAll(link, ` ^${++citationReindex}^ `);
                    citation.reindex_id = citationReindex.toString();
                    filteredCitations.push(citation);
                } else {
                    // Handle duplicate citation
                    let matchingCitation = filteredCitations.find((ct) =>
                        ct.chunk_id === citation.chunk_id &&
                        ct.id === citation.id
                    );
                    if (matchingCitation && matchingCitation.reindex_id) {
                        answerText = answerText.replaceAll(link, ` ^${matchingCitation.reindex_id}^ `);
                    }
                }
            } else {
                // Remove the citation link if citation is undefined
                answerText = answerText.replaceAll(link, '');
                console.warn(`Citation at index ${citationNumber} is undefined`);
            }
        } else {
            // Remove invalid citation reference
            answerText = answerText.replaceAll(link, '');
            console.warn(`Invalid citation index: ${citationNumber}, citations length: ${answer.citations?.length || 0}`);
        }
    });

    return {
        citations: filteredCitations,
        markdownFormatText: answerText
    };
}
