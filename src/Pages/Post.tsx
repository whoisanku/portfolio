import { Suspense } from "react";
import {
  LimitType,
  PublicationType,
  profileId,
  usePublications,
} from "@lens-protocol/react-web";

import { PublicationCard } from "../Components/cards";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";

const PublicationsList = () => {
  const {
    data: publications,
    hasMore,
    observeRef,
  } = useInfiniteScroll(
    usePublications({
      where: {
        from: [profileId("0x010040")],
        publicationTypes: [PublicationType.Post],
      },
      limit: LimitType.Ten,
    })
  );

  return (
    <div className="space-y-6">
      {publications &&
        publications.map((publication) => (
          <PublicationCard key={publication.id} publication={publication} />
        ))}
      {hasMore && (
        <p ref={observeRef} className="text-center text-gray-400">
          Loading more...
        </p>
      )}
    </div>
  );
};

export function UsePublications() {
  return (
    <div>
      <div className="text-white text-2xl flex justify-center">Posts</div>
      <div className="py-1">
        <div className="max-w-2xl mx-auto px-4">
          <Suspense
            fallback={
              <div className="text-white text-center">
                Loading publications...
              </div>
            }
          >
            <PublicationsList />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
